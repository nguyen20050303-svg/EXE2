$ErrorActionPreference = 'Stop'

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$cmdlineToolsPath = "$sdkPath\cmdline-tools\latest"

Write-Host "Creating SDK directories at $sdkPath..."
if (-not (Test-Path $cmdlineToolsPath)) {
    New-Item -ItemType Directory -Force -Path $cmdlineToolsPath | Out-Null
}

$zipPath = "$env:TEMP\cmdline-tools.zip"
if (-not (Test-Path $zipPath)) {
    Write-Host "Downloading Android Command Line Tools..."
    Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $zipPath
}

Write-Host "Extracting Command Line Tools..."
# We extract to a temp folder first, then move the inner 'cmdline-tools' content to 'latest'
$extractPath = "$env:TEMP\cmdline-tools-extract"
if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath }
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host "Moving files to final location..."
Copy-Item -Path "$extractPath\cmdline-tools\*" -Destination $cmdlineToolsPath -Recurse -Force

Write-Host "Setting environment variables..."
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPaths = @("$sdkPath\cmdline-tools\latest\bin", "$sdkPath\platform-tools", "$sdkPath\emulator")

foreach ($p in $newPaths) {
    if ($userPath -notmatch [regex]::Escape($p)) {
        $userPath += ";$p"
    }
}
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")

$env:ANDROID_HOME = $sdkPath
foreach ($p in $newPaths) {
    if ($env:Path -notmatch [regex]::Escape($p)) {
        $env:Path += ";$p"
    }
}

Write-Host "Accepting licenses and installing SDK components..."
$sdkManager = "$cmdlineToolsPath\bin\sdkmanager.bat"
$components = "platform-tools", "platforms;android-34", "build-tools;34.0.0"

# Auto-accept licenses
cmd.exe /c "echo y| $sdkManager --licenses"

Write-Host "Installing components: $($components -join ', ')..."
& $sdkManager $components

Write-Host "Android SDK setup complete!"
