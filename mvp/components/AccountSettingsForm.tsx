

import React, { useState } from 'react';
import { ProfileFormFields } from '../types'; // ProfileFormFields is now correctly imported
import { AR_LABELS, ChevronDownIcon } from '../constants';

const AccountSettingsForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('account');
  const [formData, setFormData] = useState<ProfileFormFields>({
    firstName: 'نافين',
    lastName: 'براساد',
    dob: '1997-11-05',
    phone: '+91 89404 16286',
    city: 'بنغالور',
    country: 'الهند',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Here you would typically send data to an API
    alert(AR_LABELS.update + ' ' + AR_LABELS.profileSettings + '!');
  };

  const tabs = [
    { id: 'account', label: AR_LABELS.accountSetting },
    { id: 'company', label: AR_LABELS.companySetting },
    { id: 'documents', label: AR_LABELS.documents },
    { id: 'billing', label: AR_LABELS.billing },
    { id: 'notification', label: AR_LABELS.notification },
  ];

  const countries = ['الهند', 'الولايات المتحدة', 'المملكة المتحدة', 'كندا', 'أستراليا']; // Example data
  const cities = ['بنغالور', 'دلهي', 'مومباي', 'تشيناي', 'حيدر أباد']; // Example data

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 flex-grow">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4 space-x-reverse">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200
                ${activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Form Content */}
      {activeTab === 'account' && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 text-right mb-1">
                {AR_LABELS.firstName}
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 text-right"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 text-right mb-1">
                {AR_LABELS.lastName}
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 text-right"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 text-right mb-1">
                {AR_LABELS.dateOfBirth}
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 text-right"
                />
                {/* The ChevronDownIcon now correctly accepts the className prop */}
                <ChevronDownIcon className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 text-right mb-1">
                {AR_LABELS.phone}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 text-right"
                />
                {/* The ChevronDownIcon now correctly accepts the className prop */}
                <ChevronDownIcon className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 text-right mb-1">
                {AR_LABELS.city}
              </label>
              <div className="relative">
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 text-right appearance-none"
                >
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {/* The ChevronDownIcon now correctly accepts the className prop */}
                <ChevronDownIcon className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 text-right mb-1">
                {AR_LABELS.country}
              </label>
              <div className="relative">
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900 text-right appearance-none"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {/* The ChevronDownIcon now correctly accepts the className prop */}
                <ChevronDownIcon className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-start"> {/* Align button to the right in RTL */}
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {AR_LABELS.update}
            </button>
          </div>
        </form>
      )}

      {/* Other tabs content can go here */}
      {activeTab !== 'account' && (
        <div className="text-gray-600 text-center py-10">
          محتوى تبويب {tabs.find(t => t.id === activeTab)?.label} سيذهب هنا.
        </div>
      )}
    </div>
  );
};

export default AccountSettingsForm;