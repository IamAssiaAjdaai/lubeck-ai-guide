import Image from "next/image";

type CityHeroProps = { image: string; imageAlt: string; title: string; description: string };

export default function CityHero({ image, imageAlt, title, description }: CityHeroProps) {
  return (
    <header>
      <div className="relative aspect-[5/4] overflow-hidden rounded-[var(--radius-lg)] border border-blue-100 bg-white shadow-[0_20px_50px_rgb(37_99_235_/_0.08)]">
        <Image src={image} alt={imageAlt} fill preload sizes="(max-width: 480px) calc(100vw - 48px), 432px" className="scale-[1.02] object-cover object-[50%_46%]" />
      </div>
      <div className="mx-auto mt-7 max-w-md text-center">
        <h1 className="mx-auto max-w-[21rem] text-[2.35rem] font-bold leading-[1.05] tracking-[-0.045em] text-balance">{title}</h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-text-secondary">{description}</p>
      </div>
    </header>
  );
}
