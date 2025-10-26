

import React from 'react';
import { ProfileStats } from '../types'; // ProfileStats is now correctly imported
import { AR_LABELS } from '../constants';

interface ProfileCardProps {
  name: string;
  title: string;
  stats: ProfileStats;
  profileLink: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ name, title, stats, profileLink }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 mr-6 -mt-20 w-80 text-center relative z-10 border border-gray-200 dark:border-gray-700">
      <img
        src="https://picsum.photos/100/100?random=4"
        alt={name}
        className="w-28 h-28 rounded-full mx-auto border-4 border-white dark:border-gray-800 object-cover -mt-16 shadow-lg ring-2 ring-gray-200 dark:ring-gray-700"
      />
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-4">{name}</h3>
      <p className="text-orange-500 text-sm font-medium mt-1">{title}</p>

      <div className="mt-6 border-t border-b border-gray-200 dark:border-gray-700 py-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.opportunitiesApplied}</span>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{stats.applied}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.opportunitiesWon}</span>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{stats.won}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.currentOpportunities}</span>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{stats.current}</span>
        </div>
      </div>

      <button className="mt-6 w-full bg-orange-500 text-white py-2.5 px-4 rounded-lg hover:bg-orange-600 transition-colors duration-200 font-semibold shadow-md">
        {AR_LABELS.viewPublicProfile}
      </button>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <a href={profileLink} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
          {profileLink}
        </a>
        <button
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          onClick={() => navigator.clipboard.writeText(profileLink)}
          aria-label="نسخ الرابط"
        >
          <svg className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m-4 2a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </button>
      </div>
    </div>
  );
};

export default ProfileCard;