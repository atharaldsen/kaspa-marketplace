import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fundEscrow, compoundEscrow } from "@/lib/escrow-api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const escrow = await prisma.escrow.findUnique({
    where: { id },
    include: { listing: { select: { sellerId: true } } },
  });

  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  if (
    escrow.buyerId !== session.user.id &&
    escrow.listing.sellerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await fundEscrow(escrow.escrowApiId);

    await prisma.escrow.update({
      where: { id },
      data: { status: result.status, fundingTxId: result.tx_id },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Fund error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("no mature UTXO") || msg.includes("no UTXO")) {
      return NextResponse.json(
        { error: "No payment detected at the escrow address yet. Please send KAS first, then try again." },
        { status: 400 }
      );
    }
    if (msg.includes("too small") || msg.includes("storage mass")) {
      // Try compounding fragmented UTXOs (too small or mass too large), then retry fund
      try {
        await compoundEscrow(escrow.escrowApiId);
        const retryResult = await fundEscrow(escrow.escrowApiId);
        await prisma.escrow.update({
          where: { id },
          data: { status: retryResult.status, fundingTxId: retryResult.tx_id },
        });
        return NextResponse.json(retryResult);
      } catch {
        // Compound didn't help — build user-friendly message from regex
        const needMatch = msg.match(/need at least (\d+)/);
        const haveMatch = msg.match(/UTXO amount (\d+)/);
        if (needMatch && haveMatch) {
          const need = (Number(needMatch[1]) / 100_000_000).toFixed(2);
          const have = (Number(haveMatch[1]) / 100_000_000).toFixed(2);
          return NextResponse.json(
            { error: `Not enough funds yet. ${have} KAS received but ${need} KAS is needed. Please send more KAS to the escrow address.` },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "The payment received is not enough to cover the escrow amount. Please send more KAS to the escrow address." },
          { status: 400 }
        );
      }
    }
    if (msg.includes("too large")) {
      return NextResponse.json(
        { error: "The payment exceeds the escrow amount by more than 10%. Please send a single transaction closer to the exact amount." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong while locking your funds. Please wait a moment and try again." },
      { status: 500 }
    );
  }
}
