<p align="center">
  <img src="./app-icon.png" alt="Repo Studio Icon" width="75"/>
</p>
<h1 align="center">Repo Studio</h1>
<div align="center">
  <a href="https://github.com/JohnKearney1/repostudio/releases">
    <img src="https://github.com/JohnKearney1/repostudio/actions/workflows/build.yml/badge.svg?branch=main" alt="Windows Build Badge" />
  </a>
</div>

<p align="center">
    <img src="./assets/demo.gif" alt="Repo Studio Preview"/>
    <i>A Git-like desktop app for managing and versioning audio files, built for producers and musicians.</i>
</p>

<p align="center">
  <p align="center">
    <img src="https://img.shields.io/badge/Backend-Rust-ff0000?style=for-the-badge&logo=rust" alt="Rust Badge">
    <img src="https://img.shields.io/badge/Frontend-React%20-00d8ff?style=for-the-badge&logo=react" alt="React Badge">
    <img src="https://img.shields.io/badge/Made%20with-Tauri-FFC107?style=for-the-badge&logo=tauri" alt="Tauri Badge">
  </p>
</p>

---

## 🚀 About Repo Studio

Repostudio aims to be an audio management and organizatial tool that takes after version control softwares like GitHub desktop. The basic idea is that you can create a "repository" of audio files, and then use that repository to track and manage the metadata, encodings, recipients, and locations of a bucket of files without having to actually create duplicates or do manual conversions. This solution takes a lot of legwork out of the process of managing audio files, and allows musicians to focus primarily on creative work.

---

## ⚙️ Getting Started

Are you a musician, producer, or audio enthusiast? The section below is mostly for developers.
Visit the [Releases](https://github.com/JohnKearney1/repostudio/releases) page to download the latest version of Repo Studio.

### 🛠️ Built With
- ⚡ **[Tauri Framework](https://tauri.app/)** + Rust Backend
- ⚛️ **[React](https://reactjs.org/)** + Typescript
- 🎧 [Symphonia](https://github.com/pdeljanov/Symphonia) (audio decoding)  
- 🧬 [Rusty Chromaprint](https://github.com/acoustid/rusty-chromaprint) (audio fingerprinting)  
- 🏷️ [Lofty](https://github.com/Serial-ATA/lofty-rs) (audio metadata)

---

### Prerequisites
- 📦 [Node.js](https://nodejs.org/) (v18+ recommended)
- 🦀 [Rust Toolchain](https://rustup.rs/) (Stable)
- 🔧 [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)  

---

### 🔨 Development Setup
```bash
# 1. Clone the repo
git clone https://github.com/yourusername/repo-studio.git
cd repo-studio

# 2. Install frontend dependencies
npm install

# 3. Start the dev server
npm run tauri dev
```

### 🏗️ Build for Production
```bash
npm run tauri build
```

---

## 💡 Recommended IDE Setup
- 📝 [VS Code](https://code.visualstudio.com/)
- 📦 Extensions:  
  - [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)  
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---