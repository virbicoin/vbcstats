import Link from 'next/link';
import {
    HomeIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const Header = () => {
    return (
        <div className="header-footer-wrapper">
            <header className='bg-gray-900 border-b border-gray-800'>
                <nav className='container-full mx-auto px-2 flex items-center justify-between h-14'>
                    <Link href='/' className='text-xl font-bold nav-link text-gray-100 hover:text-blue-400 transition-colors'>
                        VirBiCoin Stats
                    </Link>
                    <ul className='flex items-center space-x-2 md:space-x-4'>
                        <li>
                            <Link href='/' className='nav-link text-gray-200 flex items-center gap-1'>
                                <HomeIcon className='w-5 h-5' />
                                <span className='hidden sm:inline'>Dashboard</span>
                            </Link>
                        </li>
                        <li>
                            <Link href='https://explorer.digitalregion.jp/' className='nav-link text-gray-200 flex items-center gap-1'>
                                <MagnifyingGlassIcon className='w-5 h-5' />
                                <span className='hidden sm:inline'>Explorer</span>
                            </Link>
                        </li>
                        <li>
                            <Link href='https://pool.digitalregion.jp/' rel='noopener noreferrer' target='_blank' className='nav-link text-gray-200 flex items-center gap-1'>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 21l6-6" />
                                    <path d="M3 8a7 7 0 0 1 9.9 0l3.1 3.1a2 2 0 0 1 0 2.8l-1.4 1.4a2 2 0 0 1-2.8 0L8.7 13.1" />
                                    <path d="M14 6l4-4" />
                                </svg>
                                <span className='hidden sm:inline'>Mining Pool</span>
                            </Link>
                        </li>
                    </ul>
                </nav>
            </header>
        </div>
    );
};

export default Header;
