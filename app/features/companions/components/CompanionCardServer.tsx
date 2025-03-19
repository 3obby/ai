import Link from 'next/link';
import Image from 'next/image';

interface CompanionCardServerProps {
  id: string;
  name: string;
  description: string;
  avatar: string;
  href: string;
}

export default function CompanionCardServer({
  id,
  name,
  description,
  avatar,
  href,
}: CompanionCardServerProps) {
  return (
    <Link 
      href={href}
      className="relative flex flex-col rounded-xl overflow-hidden 
                border border-dark-700 bg-dark-900 hover:bg-dark-800
                transition-all duration-200 ease-in-out"
    >
      {/* Avatar */}
      <div className="relative h-32 w-full bg-gradient-to-b from-dark-700 to-dark-900">
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-20 h-20 rounded-full border-4 border-dark-800 overflow-hidden">
            <Image
              src={avatar || `/companions/default-avatar.png`}
              alt={name}
              width={80}
              height={80}
              className="object-cover"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 p-4 flex flex-col items-center">
        <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
        <p className="text-sm text-dark-300 text-center line-clamp-3">{description}</p>
      </div>
    </Link>
  );
} 