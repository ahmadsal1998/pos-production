

import React from 'react';
import { AR_LABELS } from '@/shared/constants';

const ProfileBanner: React.FC = () => {
  return (
    <div
      className="relative w-full h-48 bg-cover bg-center rounded-xl shadow-lg overflow-hidden"
      style={{ backgroundImage: 'url(https://picsum.photos/1200/400?random=2)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40"></div>
      <div className="relative h-full flex items-center justify-start p-6 text-white">
        <div>
          <h2 className="text-3xl font-bold mb-3">{AR_LABELS.healthyFood}</h2>
          <div className="flex items-center justify-end gap-3 mb-5">
            <img src="https://picsum.photos/40/40?random=3" alt="Harumi Kobayashi" className="w-12 h-12 rounded-full border-2 border-white shadow-md" />
            <span className="text-lg font-semibold">Harumi Kobayashi</span>
          </div>
          <div className="text-sm space-y-1 bg-black/20 rounded-lg p-3 backdrop-blur-sm">
            <p className="font-semibold">{AR_LABELS.followMe}</p>
            <p className="opacity-90">areallygreatsite.com</p>
            <p className="opacity-90">+123-456-7890</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileBanner;