import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative h-[300px] explore-bg  w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute explore-bg top-0 inset-0 bg-cover bg-center" style={{}} />

      {/* Content */}
      <div className="relative h-full explore-bg flex flex-col items-center justify-center text-center px-4">
        {/* <img src={bg} className="h-32 w-32" /> */}
        <h1 className="font-orbitron font-semibold text-2xl md:text-[28px] leading-[35px] text-white mb-4">
          Explore Events & Book Your Spot
        </h1>
        <p className="font-inter font-normal text-base leading-[25px] text-[#F7F7F7] max-w-2xl">
          Find and attend Web3-powered events, from tech conferences to music festivals. Secure your
          spot with NFT tickets!
        </p>
      </div>
    </div>
  );
};

export default Hero;
