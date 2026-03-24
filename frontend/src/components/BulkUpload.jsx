import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

const BulkUpload = ({ onFileSelected }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current.click()}
        className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
      >
        <UploadCloud size={16} />
        2: Select File
      </button>
    </div>
  );
};

export default BulkUpload;