import React from 'react';
import { SiGithub, SiX, SiBitcoin, SiDiscord, SiTelegram } from 'react-icons/si';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#0a0f1a] via-[#0d1421] to-[#0a0f1a] border-t border-[#1e3a5f]/50">
      <div className="container-full mx-auto px-4 py-4 flex items-center justify-center text-gray-400">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">
            &copy; 2024-{new Date().getFullYear()} Digitalregion, Inc.
          </span>
          <span className="text-[#1e3a5f]">|</span>
          <a
            href="https://github.com/virbicoin/vbcstats"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-all duration-200 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-blue-500/10"
          >
            <SiGithub className="w-4 h-4" />
            <span>vbcstats</span>
          </a>
          <span className="text-[#1e3a5f]">|</span>
          <a
            href="https://x.com/VirBiCoin"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-all duration-200 p-2 rounded-md hover:bg-blue-500/10"
          >
            <SiX className="w-4 h-4" />
          </a>
          <a
            href="https://bitcointalk.org/index.php?topic=5546988.0"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-all duration-200 p-2 rounded-md hover:bg-blue-500/10"
          >
            <SiBitcoin className="w-4 h-4" />
          </a>
          <a
            href="https://discord.digitalregion.jp"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-all duration-200 p-2 rounded-md hover:bg-blue-500/10"
          >
            <SiDiscord className="w-4 h-4" />
          </a>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-all duration-200 p-2 rounded-md hover:bg-blue-500/10"
          >
            <SiTelegram className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
