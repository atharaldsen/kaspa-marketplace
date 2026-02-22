import { ListingForm } from "@/components/listing-form";

export default function CreateListingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Create a Listing</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        List an item or service for sale with escrow protection.
      </p>
      <div className="mt-6">
        <ListingForm />
      </div>
    </div>
  );
}
