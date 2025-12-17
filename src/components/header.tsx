import Link from 'next/link';
import Image from 'next/image';
import {
    HomeIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function Header() {
    return (

        <header className="bg-gradient-to-r from-[#0a0f1a] via-[#0d1421] to-[#0a0f1a] border-b border-[#1e3a5f]/50 backdrop-blur-sm">
            <nav className="container-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-3 text-xl font-bold nav-link text-white hover:text-blue-300 transition-all duration-200 group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-md group-hover:bg-blue-500/30 transition-all duration-200" />
                        <Image src="/VBC.svg" alt="VBC Logo" width={36} height={36} className="relative h-9 w-9" />
                    </div>
                    <span className="tracking-tight">VirBiCoin Stats</span>
                </Link>
                <ul className="flex items-center space-x-1">
                    <li>
                        <Link href="/" className="nav-link text-gray-300 hover:text-blue-400 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-500/10 transition-all duration-200">
                            <HomeIcon className="w-5 h-5" />
                            <span className="font-medium">Dashboard</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="https://explorer.digitalregion.jp/" className="nav-link text-gray-300 hover:text-blue-400 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-500/10 transition-all duration-200">
                            <MagnifyingGlassIcon className='w-5 h-5' />
                            <span className="font-medium">Block Explorer</span>
                        </Link>
                    </li>
                    <li>
                        <Link href='https://pool.digitalregion.jp/' rel='noopener noreferrer' target='_blank' className='nav-link text-gray-300 hover:text-blue-400 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-500/10 transition-all duration-200'>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 21l6-6" />
                                <path d="M3 8a7 7 0 0 1 9.9 0l3.1 3.1a2 2 0 0 1 0 2.8l-1.4 1.4a2 2 0 0 1-2.8 0L8.7 13.1" />
                                <path d="M14 6l4-4" />
                            </svg>
                            <span className='hidden sm:inline font-medium'>Mining Pool</span>
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
};
