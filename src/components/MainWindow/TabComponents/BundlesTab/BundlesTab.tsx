import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BundlesTab.css';
import { ChevronDownIcon, ChevronRightIcon, FileIcon } from '@radix-ui/react-icons';

export default function BundlesTab() {
  // Sample data for prototyping. In the final app, this would be fetched/hooked up.
  const bundles: Bundle[] = [
    { id: '1', name: 'Bundle 1', size: '15 MB', fileIds: ['a1', 'a2', 'a3'] },
    { id: '2', name: 'Bundle 2', size: '25 MB', fileIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] },
    { id: '3', name: 'Bundle 3', size: '10 MB', fileIds: ['c1', 'c2', 'c3'] },
  ];

  return (
    <div className="BundlesTab">
      {/* If the bundles is not empty: */}
      {bundles.length > 0 ? (
        <>
          {bundles.map(bundle => (
            <BundleItem key={bundle.id} bundle={bundle} />
          ))}
        </>
      ) : (
        <div className="BundlesTab__empty">
          <h4>It's quiet around here...</h4>
          <h5>Generate some file bundles to view details!</h5>
        </div>
      )}
    </div>
  );
}

interface Bundle {
  id: string;
  name: string;
  size: string;
  fileIds: string[];
  recipients?: string[]; // Optional field for future use
  createdAt?: string; // Optional field for future use
}

interface BundleItemProps {
  bundle: Bundle;
}

function BundleItem({ bundle }: BundleItemProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(prev => !prev);
  };

  const handleRegenerateClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent the click from toggling the expansion
    // Placeholder action: Insert actual bundle re-generation logic here.
    alert(`Re-generating bundle: ${bundle.name}`);
  };

  return (
    <motion.div
      className="BundleItem"
      onClick={toggleExpanded}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ cursor: 'pointer' }}
    >
      <div className="BundleItem__header">
        <div className="BundleItem__info">
          <span className="BundleItem__name">{bundle.name}</span>
          <span className="BundleItem__size">{bundle.size}</span>
          <span className="BundleItem__count">{bundle.fileIds.length} files</span>
        </div>
        <div className="BundleItem__toggle">
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="BundleItem__details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="BundleItem__fileIds">
              {bundle.fileIds.map(fileId => (
                <span key={fileId} className="BundleItem__fileId">
                    <FileIcon />
                  {fileId}
                </span>
              ))}
            </div>
            <button className="BundleItem__button" onClick={handleRegenerateClick}>
              <FileIcon />
              Regenerate Archive
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
