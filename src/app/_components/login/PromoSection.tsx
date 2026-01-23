import Image from "next/image";

export function PromoSection() {
  return (
    <div className="hidden flex-1 items-center justify-center px-6 py-8 lg:flex">
      <Image
        src="/images/airtable_promotion.png"
        alt="Meet Omni, your AI collaborator for building custom apps"
        width={395}
        height={580}
        className="max-h-[80vh] rounded-2xl object-contain transition-transform duration-250 hover:scale-102 hover:cursor-pointer"
      />
    </div>
  );
}
