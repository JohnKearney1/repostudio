import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WindowBar from '../Layout/WindowBar';
import './Settings.css';
import STAbout from './Tabs/STAbout';
import STGeneral from './Tabs/STGeneral';
import STConnectedApps from './Tabs/STConnectedApps';
import STAudio from './Tabs/STAudio';
import STAdvanced from './Tabs/STAdvanced';

function Settings(headless: boolean) {
    const [activeTab, setActiveTab] = useState('About');

    const tabs = [
        'About',
        'General',
        'Audio',
        // 'Connected Apps',
        'Advanced'
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'About':
                return <STAbout />;
            case 'General':
                return <STGeneral />;
            case 'Audio':
                return <STAudio />;
            case 'Connected Apps':
                return <STConnectedApps />;
            case 'Advanced':
                return <STAdvanced />;
            default:
                return null;
        }
    };

    // Variants for content animations
    const contentVariants = {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 }
    };

    return (
        <div className="settings-background">
            { !headless && <WindowBar /> }
            <div className="settings-container">
                <div className="settings-sidebar"
                    // if headless is true, remove the border
                    style={headless ? { borderTop: 'none' } : {}}
                >
                    {tabs.map(tab => (
                        <motion.div
                            key={tab}
                            className={`settings-tab ${activeTab === tab ? 'selected' : ''}`}
                            onClick={() => setActiveTab(tab)}
                            whileTap={{ scale: 0.95 }}
                        >
                            {tab}
                        </motion.div>
                    ))}
                </div>
                <div className="settings-main">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={activeTab}
                            variants={contentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className='settings-content'
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Settings;
