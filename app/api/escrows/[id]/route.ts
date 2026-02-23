import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEscrowStatus, fundEscrow, compoundEscrow } from "@/lib/escrow-api";

// GET /api/escrows/[id] — get escrow detail with live status from Rust API
export async function GET(
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
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          escrowPattern: true,
          sellerId: true,
          stages: true,
          seller: { select: { id: true, name: true, image: true } },
        },
      },
      buyer: { select: { id: true, name: true, image: true } },
    },
  });

  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  // Verify user is buyer or seller
  if (
    escrow.buyerId !== session.user.id &&
    escrow.listing.sellerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch live status from Rust API
  let liveStatus = null;
  try {
    liveStatus = await getEscrowStatus(escrow.escrowApiId);

    // Auto-lock: when payment is detected, automatically fund the escrow
    if (liveStatus.status === "funded" && !escrow.fundingTxId) {
      try {
        const fundResult = await fundEscrow(escrow.escrowApiId);
        liveStatus = {
          ...liveStatus,
          status: fundResult.status,
          funding_tx_id: fundResult.tx_id,
        };
        await prisma.escrow.update({
          where: { id },
          data: {
            status: fundResult.status,
            fundingTxId: fundResult.tx_id,
          },
        });
      } catch (fundErr) {
        const msg = fundErr instanceof Error ? fundErr.message : "";
        // If UTXO too small, try compounding first then retry
        if (msg.includes("too small")) {
          try {
            await compoundEscrow(escrow.escrowApiId);
            // Retry fund after compounding
            const retryResult = await fundEscrow(escrow.escrowApiId);
            liveStatus = {
              ...liveStatus,
              status: retryResult.status,
              funding_tx_id: retryResult.tx_id,
            };
            await prisma.escrow.update({
              where: { id },
              data: {
                status: retryResult.status,
                fundingTxId: retryResult.tx_id,
              },
            });
          } catch (compoundErr) {
            console.error("Auto-compound+fund failed:", compoundErr);
            // Fall through — return "funded" status so frontend shows progress
          }
        } else {
          console.error("Auto-fund failed:", fundErr);
          // Fall through — return "funded" status
        }
      }
    }

    // Sync status back to DB if changed
    if (liveStatus.status !== escrow.status) {
      await prisma.escrow.update({
        where: { id },
        data: {
          status: liveStatus.status,
          fundingTxId: liveStatus.funding_tx_id ?? escrow.fundingTxId,
          releaseTxId: liveStatus.release_tx_id ?? escrow.releaseTxId,
          refundTxId: liveStatus.refund_tx_id ?? escrow.refundTxId,
          disputeTxId: liveStatus.dispute_tx_id ?? escrow.disputeTxId,
        },
      });
    }
  } catch (err) {
    console.error("Failed to fetch live escrow status:", err);
    // Rust API may be down — return DB state
  }

  // Fetch sibling escrows for staged payments
  const siblings = await prisma.escrow.findMany({
    where: { listingId: escrow.listingId },
    select: { id: true, stageIndex: true, status: true, escrowAmount: true },
    orderBy: { stageIndex: "asc" },
  });

  // Parse stage names from listing
  const stageNames: string[] = [];
  if (escrow.listing.stages) {
    try {
      const parsed = JSON.parse(escrow.listing.stages as string) as { name: string }[];
      parsed.forEach((s) => stageNames.push(s.name));
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    id: escrow.id,
    escrowApiId: escrow.escrowApiId,
    status: liveStatus?.status ?? escrow.status,
    fundingAddress: escrow.fundingAddress,
    escrowAmount: escrow.escrowAmount.toString(),
    stageIndex: escrow.stageIndex,
    fundingTxId: liveStatus?.funding_tx_id ?? escrow.fundingTxId,
    releaseTxId: liveStatus?.release_tx_id ?? escrow.releaseTxId,
    refundTxId: liveStatus?.refund_tx_id ?? escrow.refundTxId,
    disputeTxId: liveStatus?.dispute_tx_id ?? escrow.disputeTxId,
    utxoAmount: liveStatus?.utxo_amount,
    currentDaa: liveStatus?.current_daa,
    expiresAtDaa: liveStatus?.expires_at_daa,
    fundingConfirmed: liveStatus?.funding_confirmed ?? false,
    settlementConfirmed: liveStatus?.settlement_confirmed ?? false,
    listing: {
      ...escrow.listing,
      price: escrow.listing.price.toString(),
    },
    buyer: escrow.buyer,
    role: escrow.buyerId === session.user.id ? "buyer" : "seller",
    createdAt: escrow.createdAt,
    stages: siblings.length > 1
      ? siblings.map((s, i) => ({
          id: s.id,
          stageIndex: s.stageIndex,
          status: s.status,
          escrowAmount: s.escrowAmount.toString(),
          stageName: stageNames[i] || undefined,
        }))
      : null,
  });
}
