# Setup GitHub Deploy Key

## 📋 Prerequisites

You need to add the SSH public key to GitHub repository as a deploy key.

## 🔑 SSH Key

Your public key is already generated:

```bash
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHKtrCVxgiKt0kLIna/+dU8wELxTpPRPqksXEUSUKSeo kpi-engine-deploy
```

## 📝 Steps to Add Deploy Key to GitHub

### Option 1: Via GitHub Web Interface

1. Open your repository: https://github.com/itBiensi/kpi-engine/settings/keys
2. Click "New deploy key" or "Add deploy key"
3. Title: `kpi-engine-server` (or any name you prefer)
4. Key: Copy the public key above
5. **Important:** Check "Allow write access" if you want the key to be able to push
6. Click "Add deploy key"

### Option 2: Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# Ubuntu/Debian:
sudo apt install gh

# Login to GitHub
gh auth login

# Add deploy key to your repository
gh secret set --repos=itBiensi/kpi-engine deploy_key "kpi-engine-server" --body "$(cat ~/.ssh/id_ed25519.pub)"
```

Note: For deploy keys, the web interface is recommended as CLI support may vary.

## ✅ Verification

After adding the key, verify it works:

```bash
# Test SSH connection to GitHub
ssh -T git@github.com

# Test git push
cd /opt/kpi-engine
git push origin master
```

## 🔐 Security Notes

- This key is stored in `~/.ssh/id_ed25519` on the server
- **Never share the private key**: `~/.ssh/id_ed25519`
- This key has write access when added as a deploy key
- You can revoke or delete this key at any time from repository settings
- Consider using different keys for different servers/environments

## 🔄 Troubleshooting

### "Permission denied (publickey)"

**Cause:** Deploy key not added correctly or doesn't have write access

**Solution:**
1. Verify key is added to repository: https://github.com/itBiensi/kpi-engine/settings/keys
2. Check "Allow write access" is checked
3. Wait a few minutes for GitHub to propagate the change

### "fatal: 'origin' does not appear to be a git repository"

**Cause:** Git remote configuration issue

**Solution:**
```bash
cd /opt/kpi-engine
git remote -v
```

If it doesn't show git@github.com, re-add it:
```bash
git remote remove origin
git remote add origin git@github.com:itBiensi/kpi-engine.git
```

## 📚 Additional Resources

- GitHub SSH Keys Documentation: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- Git Push Documentation: https://git-scm.com/docs/git-push
- SSH Key Management: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys

---

**Last Updated:** 2026-02-16
