import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/", height = 44, className }: { href?: string; height?: number; className?: string }) {
  return (
    <Link href={href} className={className} aria-label="Bakma Store — accueil">
      <Image src="/logo.png" alt="Bakma Store" width={Math.round(height * 2.7)} height={height} priority style={{ height, width: "auto" }} />
    </Link>
  );
}
