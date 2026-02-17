export function generateSettingsJson(): object {
  return {
    permissions: {
      deny: [
        "Edit(~/.exeflow/**)",
        "Write(~/.exeflow/**)",
        "Read(~/.exeflow/credentials.json)",
        "Edit(.claude/settings.json)",
        "Edit(.claude/settings.local.json)",
        "Bash(rm -rf *)",
        "Bash(curl * | bash)",
        "Bash(npm publish *)",
        "Bash(git push --force *)",
      ],
    },
  };
}
