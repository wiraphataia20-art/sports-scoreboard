export default function TeamLogo({ name, logoUrl, className = "w-8 h-8" }: {
  name: string;
  logoUrl?: string;
  className?: string;
}) {
  if (!logoUrl) return null;
  return <img src={logoUrl} alt={name} className={`${className} rounded-full object-cover shrink-0`} />;
}
