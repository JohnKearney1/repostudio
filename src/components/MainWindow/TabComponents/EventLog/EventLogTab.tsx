import { CheckCircledIcon, ChevronDownIcon, ChevronRightIcon, CrossCircledIcon, ExclamationTriangleIcon, InfoCircledIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons"
import { motion, AnimatePresence } from "framer-motion"
import { useEventLoggerStore } from "../../../../scripts/store/EventLogger"
import { useState } from "react"
import './EventLogTab.css'

export default function EventLogTab() {
    const { events } = useEventLoggerStore()
    // Store expanded state for each event using its index as key
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    // Helper function to format ISO timestamp to hh:mm:ss
    const formatTime = (timestamp: string | number | Date) => {
        const date = new Date(timestamp);
        return date.toTimeString().split(' ')[0]; // returns hh:mm:ss
    };

    // Animation variants for event items
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    }

    return (
        <motion.div
            className="event-log-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <h4>Event Log</h4>
            <h5 style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                { events.length === 0 ? "No events logged yet" : `${events.length} events logged. Click to expand details.`}
                <br />
                <div style={{display: 'flex', flexDirection: 'row', gap: '0.5rem'}}>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '0.5rem'}}><CheckCircledIcon color="limegreen" /> Success</div>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '0.5rem'}}><CrossCircledIcon color="red" /> Error</div>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '0.5rem'}}><ExclamationTriangleIcon color="orange" /> Warning</div>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '0.5rem'}}><InfoCircledIcon color="teal" /> Info</div>
                </div>
            </h5>
            <div className="divider" />
            
            <div className="divider" />
            <div className="event-log-list">
                <AnimatePresence>
                    {events.map((event, index) => (
                        <motion.div
                            key={event.timestamp || index}
                            className="event-item"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            onClick={() => setExpanded(prev => ({ ...prev, [index]: !prev[index] }))}
                            style={{ cursor: 'pointer', backgroundColor: expanded[index] ? '#1a1a1a' : 'transparent', gap: '0.5rem' }}
                            whileHover={{ backgroundColor: '#1a1a1a'}}
                            whileTap={{ scale: 0.97 }}
                        >
                            <div className="event-item-content">
                                <h4 className="event-title">
                                    {
                                        expanded[index] ? <ChevronDownIcon /> : <ChevronRightIcon />
                                    } <div style={{color: "grey"}}>{formatTime(event.timestamp)}</div> {event.text.toUpperCase()}
                                </h4>
                                <div className="event-status-icon">
                                    {event.status === "success" && <CheckCircledIcon color="limegreen"/>}
                                    {event.status === "error" && <CrossCircledIcon color="red" />}
                                    {event.status === "warning" && <ExclamationTriangleIcon color="orange" />}
                                    {event.status === "info" && <InfoCircledIcon color="teal" />}
                                    {/* If event status is null, or anything else, show QuestionmarkCircledIcon */}
                                    {event.status === undefined && <QuestionMarkCircledIcon color="gray" />}

                                </div>
                            </div>
                            <AnimatePresence>
                                {expanded[index] && (
                                    <motion.div
                                        key="description"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem'}}
                                    >
                                        <h5>{event.description}</h5>
                                        {event.status? (
                                            <h6>
                                                Status Code: {event.status}
                                            </h6>
                                        ) : (
                                            <h6>
                                                No status code available
                                            </h6>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
