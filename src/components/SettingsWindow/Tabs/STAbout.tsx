import { getVersion } from "@tauri-apps/api/app";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

export default function STAbout() {
    const [appVersion, setAppVersion] = useState<string>("");

    useEffect(() => {
        const fetchVersion = async () => {
            const version = await getVersion();
            setAppVersion(version);
        };
        fetchVersion();
    }, []);

    const typeText = 'This software is a work in progress. If you find a bug, please report it on GitHub.';
    const letters = typeText.split("");

    // Parent container to stagger each letter's animation.
    const containerVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.02,
            }
        }
    };

    // Each letter will fade in.
    const letterVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    return (
        <div style={{ width: "100%" }}>
            <h4>About</h4>
            <br />
            <h5>RepoStudio</h5>
            <h5>
                Version:{" "}
                <a
                    href={`https://github.com/JohnKearney1/repostudio/releases/tag/v${appVersion}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {appVersion || 'Loading...'}
                </a>
            </h5>
            <h5>Author: John Kearney</h5>
            <h5>License: None</h5>
            <br />
            <h5>
                <a
                    href="https://github.com/JohnKearney1/repostudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center" }}
                >
                    <GitHubLogoIcon style={{ marginRight: "5px" }} />
                    Repo Studio on GitHub
                </a>
            </h5>
            <br />
            <h5>
                <motion.span
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    style={{ display: "inline-block" }}
                >
                    {letters.map((letter, index) => (
                        <motion.span key={index} variants={letterVariants}>
                            {letter}
                        </motion.span>
                    ))}
                </motion.span>
            </h5>
        </div>
    );
}
