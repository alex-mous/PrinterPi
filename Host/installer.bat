:: Installer for the host program for the Google Chrome extension

:: Add to the current user in the registry
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.polarpiberry.thermal.printer.system" /ve /t REG_SZ /d "%~dp0manifest.json" /f