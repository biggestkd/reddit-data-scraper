#!/bin/bash

# Update package list and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install -y python3 python3-pip

# Install a Torrent client (Transmission CLI)
sudo apt install -y transmission-cli

# Install zstd extraction tool
sudo apt install -y zstd

# Install Git
sudo apt install -y git

# Verify installations
echo "=== Installed Versions ==="
python3 --version
pip3 --version
transmission-cli --version
zstd --version
git --version

echo "=== Installation Complete ==="
