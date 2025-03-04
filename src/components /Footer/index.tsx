import React from 'react';
import { FooterSection } from '../../types';
import { 
  Twitter, 
  MessageCircle, 
  Send, 
  Youtube, 
  Linkedin,
  Facebook,
  Instagram,
  Mail,
  Globe,
  Music
} from 'lucide-react';

const footerSections: FooterSection[] = [
  {
    title: 'Support',
    links: [
      'Documentation',
      'Fees',
      'Privacy Policy',
      'Terms & Conditions',
      'Ticket City Verify',
      'FAQ',
      'Support Center',
      'Sitemap',
      'Refund & Cancellation Policy'
    ]
  },
  {
    title: 'Products',
    links: [
      'Events',
      'Ticket Selling',
      'ETN Token',
      'Articles'
    ]
  },
  {
    title: 'Featured Articles',
    links: [
      'The Future of Web3 Ticketing',
      'How to Buy ETN?',
      'CrossFi Blockchain Review',
      'How to Use Decentralized Exchanges?',
      'What is MetaMask?'
    ]
  },
  {
    title: 'Services',
    links: [
      'Plugins',
      'APIs',
      'Compare Packages'
    ]
  }
];

const socialIcons = {
  twitter: Twitter,
  discord: MessageCircle,
  telegram: Send,
  medium: Globe,
  youtube: Youtube,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music,
  email: Mail
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-borderStroke py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-poppins font-semibold text-lg leading-[27px] tracking-[0.05%] text-white mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-inter text-sm leading-[17px] text-white hover:text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Logo and Description */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div className="max-w-md">
            <img src="/logo.svg" alt="TicketCity" className="h-8 mb-4" />
            <p className="text-white font-inter text-sm">
              The Best Decentralized Crypto Ticketing Platform.
              Transparent, Secure, & Blockchain-Powered Ticketing for Events.
            </p>
          </div>
          
          {/* Social Links */}
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(socialIcons).map(([key, Icon]) => (
              <a
                key={key}
                href="#"
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-primary/10 transition-colors"
              >
                <Icon className="w-5 h-5 text-white" />
              </a>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="text-center border-t border-borderStroke pt-6">
          <p className="font-roboto text-base leading-[19px] text-white">
            Contact: support@ticketcity.com
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;