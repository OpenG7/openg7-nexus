
#requires -version 5.0
$ErrorActionPreference = 'Stop'

# Vérifie qu'on est bien sous Windows PowerShell (v5), pas pwsh
if ($PSVersionTable.PSEdition -ne $null -and $PSVersionTable.PSEdition -ne 'Desktop') {
    Write-Error "Ce script doit être exécuté avec Windows PowerShell 5 (powershell.exe), pas pwsh."
}

# Vérifie/ajuste la politique d'exécution pour l'utilisateur courant
try {
    $currentExecutionPolicy = Get-ExecutionPolicy -Scope CurrentUser
}
catch {
    $currentExecutionPolicy = $null
}

$policyRank = [ordered]@{
    'Undefined'    = 0
    'Restricted'   = 1
    'AllSigned'    = 2
    'RemoteSigned' = 3
    'Unrestricted' = 4
    'Bypass'       = 5
    'Default'      = 6
}

$needsPolicyUpdate = $true
if ($currentExecutionPolicy -and $policyRank.Contains($currentExecutionPolicy)) {
    $needsPolicyUpdate = ($policyRank[$currentExecutionPolicy] -lt $policyRank['RemoteSigned'])
}

if ($needsPolicyUpdate) {
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
}

# Console en UTF-8 (sans BOM)
chcp 65001 > $null
[Console]::InputEncoding  = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

# Valeurs par défaut UTF-8 pour les cmdlets qui lisent/écrivent des fichiers
$PSDefaultParameterValues['Out-File:Encoding']    = 'utf8'   # PS5 = UTF-8 avec BOM
$PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'   # PS5 = UTF-8 avec BOM
$PSDefaultParameterValues['Add-Content:Encoding'] = 'utf8'
$PSDefaultParameterValues['Export-Csv:Encoding']  = 'utf8'
$PSDefaultParameterValues['ConvertTo-Json:Depth'] = 10       # optionnel, pratique

# Astuce pour UTF-8 **sans** BOM en PS5 (fonction utilitaire)
function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host "=== installation des outils de développement de base ==="

$script:StepResults = @()

function Add-StepResult {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Description,

        [Parameter(Mandatory = $true)]
        [string]$Status,

        [string]$Details
    )

    $script:StepResults += [PSCustomObject]@{
        Description = $Description
        Statut       = $Status
        Details      = $Details
    }
}

function Show-StepSummary {
    Write-Host ""
    Write-Host "=== Récapitulatif détaillé des étapes ==="

    foreach ($result in $script:StepResults) {
        $statusIcon = switch ($result.Statut) {
            'Succès'         { '✅' }
            'Validé'         { '✅' }
            'Installé'       { '📦' }
            'Mis à jour'     { '🔁' }
            'Déjà installé'  { 'ℹ️' }
            'Échec'          { '❌' }
            default          { 'ℹ️' }
        }

        Write-Host ("{0} {1} - {2}" -f $statusIcon, $result.Statut, $result.Description)

        if ($result.Details) {
            Write-Host ("    Détails : {0}" -f $result.Details)
        }
    }

    Write-Host ""
}

function Test-IsCurrentUserAdministrator {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function ConvertTo-ArgumentToken {
    param(
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return '""'
    }

    $stringValue = [string]$Value

    if ([string]::IsNullOrEmpty($stringValue)) {
        return '""'
    }

    if ($stringValue -notmatch '[\s"]') {
        return $stringValue
    }

    try {
        $quoted = [Management.Automation.Language.CodeGeneration]::QuoteArgument($stringValue)
        if (-not [string]::IsNullOrEmpty($quoted)) {
            return $quoted
        }
    }
    catch {
        # Fallback manuel ci-dessous
    }

    $escapedValue = $stringValue -replace '"', '`"'
    return '"' + $escapedValue + '"'
}

function Invoke-YarnVersionCheck {
    $envVarName = 'COREPACK_ENABLE_DOWNLOAD_PROMPT'
    $envVarPath = "Env:$envVarName"
    $previousValue = $null
    $hadPreviousValue = $false

    if (Test-Path $envVarPath) {
        $previousValue = (Get-Item $envVarPath).Value
        $hadPreviousValue = $true
    }

    try {
        $env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
        $versionOutput = yarn --version
        return [PSCustomObject]@{
            Success = $true
            Version = $versionOutput
            Error   = $null
        }
    }
    catch {
        return [PSCustomObject]@{
            Success = $false
            Version = $null
            Error   = $_
        }
    }
    finally {
        if ($hadPreviousValue) {
            $env:COREPACK_ENABLE_DOWNLOAD_PROMPT = $previousValue
        }
        else {
            Remove-Item $envVarPath -ErrorAction SilentlyContinue
        }
    }
}

function Read-YesNoPrompt {
    param(
        [Parameter()][string]$Prompt = 'Souhaitez-vous continuer ? (o/n)'
    )

    while ($true) {
        $response = Read-Host -Prompt $Prompt

        if ($null -eq $response) {
            continue
        }

        $normalized = $response.Trim().ToLowerInvariant()

        if ($normalized -in @('o', 'oui', 'y', 'yes')) {
            return $true
        }

        if ($normalized -in @('n', 'non', 'no')) {
            return $false
        }

        Write-Host "Veuillez répondre par o/n (ou yes/no)."
    }
}

function Read-MenuSelection {
    param(
        [Parameter(Mandatory = $true)][System.Collections.IEnumerable]$Options,
        [string]$Prompt = 'Sélectionnez une option avec ↑/↓ puis Entrée :'
    )

    $optionList = @()

    foreach ($option in $Options) {
        if ($null -eq $option) {
            continue
        }

        $label = $null
        $value = $null

        if ($option -is [System.Collections.IDictionary]) {
            if ($option.Contains('Label')) {
                $label = [string]$option['Label']
            }

            if ($option.Contains('Value')) {
                $value = $option['Value']
            }
        }
        else {
            $optionProperties = $option.PSObject.Properties

            if ($optionProperties['Label']) {
                $label = [string]$optionProperties['Label'].Value
            }

            if ($optionProperties['Value']) {
                $value = $optionProperties['Value'].Value
            }
        }

        if ([string]::IsNullOrWhiteSpace($label)) {
            $label = [string]$option
        }

        if ($null -eq $value) {
            $value = $option
        }

        $optionList += [PSCustomObject]@{
            Label = $label
            Value = $value
        }
    }

    if ($optionList.Count -eq 0) {
        throw "Read-MenuSelection nécessite au moins une option."
    }

    Write-Host ''
    Write-Host $Prompt

    $selectedIndex = 0
    $menuTop = [System.Console]::CursorTop
    $firstRender = $true

    while ($true) {
        if (-not $firstRender) {
            try {
                [System.Console]::SetCursorPosition(0, $menuTop)
            }
            catch {
                # Si le repositionnement échoue (console non interactive), on quitte la boucle et renvoie la sélection courante.
                break
            }
        }
        else {
            $firstRender = $false
        }

        $windowWidth = [System.Console]::WindowWidth
        if ($windowWidth -le 0) {
            $windowWidth = 120
        }

        for ($i = 0; $i -lt $optionList.Count; $i++) {
            $currentOption = $optionList[$i]
            $prefix = if ($i -eq $selectedIndex) { '> ' } else { '  ' }
            $labelText = [string]$currentOption.Label

            if ($labelText.Length -ge ($windowWidth - $prefix.Length)) {
                $maxLength = [Math]::Max($windowWidth - $prefix.Length - 1, 0)
                if ($maxLength -gt 0 -and $labelText.Length -gt $maxLength) {
                    $labelText = $labelText.Substring(0, $maxLength) + '…'
                }
            }

            $line = $prefix + $labelText
            if ($line.Length -lt $windowWidth) {
                $line = $line.PadRight($windowWidth)
            }

            [System.Console]::Write($line)
            [System.Console]::Write([Environment]::NewLine)
        }

        $keyInfo = [System.Console]::ReadKey($true)

        switch ($keyInfo.Key) {
            ([System.ConsoleKey]::UpArrow) {
                $selectedIndex--
                if ($selectedIndex -lt 0) {
                    $selectedIndex = $optionList.Count - 1
                }
            }
            ([System.ConsoleKey]::DownArrow) {
                $selectedIndex++
                if ($selectedIndex -ge $optionList.Count) {
                    $selectedIndex = 0
                }
            }
            ([System.ConsoleKey]::Enter) {
                try {
                    [System.Console]::SetCursorPosition(0, $menuTop + $optionList.Count)
                }
                catch {
                    # Ignorer les erreurs de repositionnement : on poursuit simplement.
                }

                Write-Host ''
                return $optionList[$selectedIndex]
            }
            default {
                # touches ignorées
            }
        }
    }

    return $optionList[$selectedIndex]
}

function Wait-ForUserConfirmationToClose {
    param(
        [string]$Message = 'Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window...'
    )

    Write-Host ''
    Write-Host $Message

    try {
        [void][System.Console]::ReadKey($true)
    }
    catch {
        Read-Host -Prompt $Message | Out-Null
    }
}

function Restart-CurrentScriptAsAdministrator {
    param(
        [Parameter()]
        [AllowNull()]
        [AllowEmptyCollection()]
        [object[]]$OriginalArguments = @()
    )

    Write-Host ""
    Write-Host "=== Élévation requise ==="
    Write-Host "Relance du script avec des privilèges administrateur..."

    $powershellExecutable = Join-Path $PSHOME 'powershell.exe'
    if (-not (Test-Path $powershellExecutable)) {
        $powershellExecutable = 'powershell.exe'
    }

    $quotedScriptPath = ConvertTo-ArgumentToken -Value $PSCommandPath
    $quotedArguments = @()

    foreach ($argument in $OriginalArguments) {
        $quotedArguments += ConvertTo-ArgumentToken -Value $argument
    }

    $argumentList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $quotedScriptPath) + $quotedArguments

    try {
        Start-Process -FilePath $powershellExecutable -ArgumentList $argumentList -Verb RunAs
    }
    catch {
        Write-Error "Impossible de relancer le script avec des privilèges administrateur : $($_.Exception.Message)"
        Wait-ForUserConfirmationToClose -Message 'Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window...'
        exit 1
    }

    Wait-ForUserConfirmationToClose -Message "Une fenêtre élevée va poursuivre l'installation. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."

    exit
}

function Invoke-CriticalStep {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Description,

        [Parameter(Mandatory = $true)]
        [scriptblock]$Action,

        [string]$DetailMessage
    )

    Write-Host ""
    Write-Host "--- $Description"
    try {
        $actionResult = & $Action

        $resolvedStatus = 'Succès'
        $resolvedDetails = $DetailMessage

        if ($null -ne $actionResult) {
            $statusCandidate = $null
            $detailsCandidate = $null

            if ($actionResult -is [System.Collections.IDictionary]) {
                if ($actionResult.Contains('Status')) {
                    $statusCandidate = [string]$actionResult['Status']
                }
                if ($actionResult.Contains('Details')) {
                    $detailsCandidate = [string]$actionResult['Details']
                }
            }
            else {
                $properties = $actionResult.PSObject.Properties

                if ($properties.Match('Status').Count -gt 0) {
                    $statusCandidate = [string]$properties['Status'].Value
                }

                if ($properties.Match('Details').Count -gt 0) {
                    $detailsCandidate = [string]$properties['Details'].Value
                }
            }

            if (-not [string]::IsNullOrWhiteSpace($statusCandidate)) {
                $resolvedStatus = $statusCandidate
            }

            if (-not [string]::IsNullOrWhiteSpace($detailsCandidate)) {
                $resolvedDetails = $detailsCandidate
            }
            elseif (-not $PSBoundParameters.ContainsKey('DetailMessage')) {
                if ($actionResult -is [string]) {
                    $resolvedDetails = $actionResult.Trim()
                }
                elseif ($actionResult -is [System.Collections.IEnumerable]) {
                    $resolvedDetails = ($actionResult | ForEach-Object { $_.ToString().Trim() }) -join " "
                }
                else {
                    $resolvedDetails = $actionResult.ToString().Trim()
                }

                if ([string]::IsNullOrWhiteSpace($resolvedDetails)) {
                    $resolvedDetails = $null
                }
            }
        }
        elseif (-not $PSBoundParameters.ContainsKey('DetailMessage')) {
            $resolvedDetails = $null
        }

        $statusIcon = switch ($resolvedStatus) {
            'Succès'        { '✅' }
            'Validé'        { '✅' }
            'Installé'      { '📦' }
            'Mis à jour'    { '🔁' }
            'Déjà installé' { 'ℹ️' }
            default         { '✅' }
        }

        if ($resolvedDetails) {
            Write-Host ("{0} {1} - {2}" -f $statusIcon, $resolvedStatus, $Description)
            Write-Host ("    {0}" -f $resolvedDetails)
        }
        else {
            Write-Host ("{0} {1} - {2}" -f $statusIcon, $resolvedStatus, $Description)
        }

        Add-StepResult -Description $Description -Status $resolvedStatus -Details $resolvedDetails
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "❌ Échec de l'étape '$Description' : $errorMessage"
        if ($_.InvocationInfo -and $null -ne $_.InvocationInfo.PositionMessage) {
            Write-Error $_.InvocationInfo.PositionMessage
        }
        Add-StepResult -Description $Description -Status 'Échec' -Details $errorMessage
        Show-StepSummary
        Write-Host ""
        Wait-ForUserConfirmationToClose -Message 'Une erreur est survenue. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window...'
        exit 1
    }
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path

Invoke-CriticalStep -Description "Déplacement dans le dossier racine du projet" -Action {
    Set-Location -Path $scriptDirectory
    $currentPath = (Get-Location).Path
    return [PSCustomObject]@{
        Status  = 'Succès'
        Details = "Répertoire courant positionné sur $currentPath."
    }
}

if (-not (Test-IsCurrentUserAdministrator)) {
    Restart-CurrentScriptAsAdministrator -OriginalArguments $args
}

Invoke-CriticalStep -Description "Vérification des droits administrateur" -Action {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Ce script doit être exécuté dans une console PowerShell lancée en tant qu'administrateur."
    }

    Write-Host "Contexte administrateur confirmé pour $($currentIdentity.Name)."

    return [PSCustomObject]@{
        Status  = 'Validé'
        Details = "Exécution en tant qu'administrateur confirmée pour $($currentIdentity.Name)."
    }
}

Invoke-CriticalStep -Description "Validation de l'outil winget" -Action {
    $wingetCommand = Get-Command winget -ErrorAction SilentlyContinue
    if ($null -eq $wingetCommand) {
        throw "winget est requis. Installez Microsoft App Installer depuis le Microsoft Store et relancez le script."
    }

    $wingetVersion = winget --version
    if ($wingetVersion) {
        $wingetVersion = $wingetVersion.Trim()
        Write-Host "winget détecté : version $wingetVersion"
    }

    return [PSCustomObject]@{
        Status  = 'Déjà installé'
        Details = $(if ($wingetVersion) { "winget est disponible (version $wingetVersion)." } else { "winget est disponible sur cette machine." })
    }
}

Invoke-CriticalStep -Description "Vérification de Git" -Action {
    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if ($null -eq $gitCommand) {
        throw "Git est requis. Installez-le depuis https://git-scm.com/download/win puis relancez le script."
    }

    $gitVersion = git --version
    Write-Host "Git détecté : $gitVersion"

    return [PSCustomObject]@{
        Status  = 'Déjà installé'
        Details = "Git est disponible ($gitVersion)."
    }
}

Invoke-CriticalStep -Description "Installation ou mise à niveau de Node.js LTS" -Action {
    $detailMessages = @()
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $status = 'Déjà installé'

    if ($null -eq $nodeCommand) {
        $detailMessages += "Node.js n'a pas été détecté sur le chemin système ; installation de la distribution LTS la plus récente."
        $status = 'Installé'
        winget install --exact --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        $installedVersion = node --version
        if ($installedVersion) {
            Write-Host "Node.js installé : $installedVersion"
            $detailMessages += "Node.js a été installé avec succès, la commande 'node --version' renvoie désormais $installedVersion."
        }
        else {
            Write-Host "Node.js vient d'être installé via winget."
            $detailMessages += "Node.js a été installé via winget ; la commande 'node --version' n'a pas encore renvoyé de valeur exploitable."
        }
    }
    else {
        $nodeVersionOutput = node --version
        Write-Host "Node.js détecté : $nodeVersionOutput"
        $detailMessages += "Node.js est présent sur cette machine (node --version => $nodeVersionOutput)."

        if ($nodeVersionOutput -match '^v(\d+)') {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -lt 18) {
                Write-Host "Version trop ancienne, mise à niveau vers la dernière LTS..."
                $detailMessages += "La version majeure actuelle ($majorVersion) est inférieure à la version LTS requise (>= 18) ; lancement d'une mise à niveau via winget."
                $status = 'Mis à jour'
                winget install --exact --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
                $updatedVersion = node --version
                if ($updatedVersion) {
                    Write-Host "Node.js mis à jour : $updatedVersion"
                    $detailMessages += "Après mise à niveau, 'node --version' renvoie $updatedVersion, confirmant l'alignement sur la LTS."
                }
                else {
                    $detailMessages += "La mise à niveau s'est terminée ; la commande 'node --version' n'a pas encore renvoyé de valeur."
                }
            }
            else {
                $detailMessages += "La version détectée satisfait le prérequis (>= 18), aucune action supplémentaire n'est nécessaire."
            }
        }
        else {
            $detailMessages += "La chaîne de version renvoyée ($nodeVersionOutput) ne peut être interprétée ; une mise à niveau winget vers la LTS officielle est déclenchée par précaution."
            $status = 'Mis à jour'
            winget install --exact --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
            $normalizedVersion = node --version
            if ($normalizedVersion) {
                Write-Host "Node.js normalisé : $normalizedVersion"
                $detailMessages += "Après réinstallation, 'node --version' renvoie $normalizedVersion."
            }
            else {
                $detailMessages += "Une réinstallation de Node.js a été effectuée ; la commande 'node --version' n'a pas renvoyé de valeur immédiatement."
            }
        }
    }

    $detailsText = ($detailMessages -join " ").Trim()
    if ([string]::IsNullOrWhiteSpace($detailsText)) {
        $detailsText = $null
    }

    return [PSCustomObject]@{
        Status  = $status
        Details = $detailsText
    }
}

function Normalize-PathValue {
    param([string]$PathValue)

    if ([string]::IsNullOrWhiteSpace($PathValue)) {
        return $null
    }

    $trimmed = $PathValue.Trim()

    while ($trimmed.EndsWith(';')) {
        $trimmed = $trimmed.Substring(0, $trimmed.Length - 1)
    }

    $trimmed = $trimmed.TrimEnd('\')

    try {
        return [System.IO.Path]::GetFullPath($trimmed)
    }
    catch {
        return $trimmed
    }
}

function Resolve-MkcertExecutable {
    $candidates = @()

    $command = Get-Command mkcert -ErrorAction SilentlyContinue
    if ($null -ne $command -and -not [string]::IsNullOrWhiteSpace($command.Source)) {
        $candidates += $command.Source
    }

    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates += (Join-Path -Path $env:LOCALAPPDATA -ChildPath 'Microsoft\WinGet\Links\mkcert.exe')
        $candidates += (Join-Path -Path $env:LOCALAPPDATA -ChildPath 'Microsoft\WindowsApps\mkcert.exe')
        $candidates += (Join-Path -Path $env:LOCALAPPDATA -ChildPath 'Microsoft\WinGet\Packages\FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe\mkcert.exe')
    }

    foreach ($candidate in ($candidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    return $null
}

function Add-DirectoryToSessionPath {
    param(
        [Parameter(Mandatory = $true)][string]$DirectoryPath
    )

    $normalizedDirectory = Normalize-PathValue -PathValue $DirectoryPath
    if ([string]::IsNullOrWhiteSpace($normalizedDirectory)) {
        return $false
    }

    $currentEntries = @()
    if (-not [string]::IsNullOrWhiteSpace($env:Path)) {
        $currentEntries = $env:Path -split ';'
    }

    foreach ($entry in $currentEntries) {
        if ((Normalize-PathValue -PathValue $entry) -eq $normalizedDirectory) {
            return $false
        }
    }

    if ([string]::IsNullOrWhiteSpace($env:Path)) {
        $env:Path = $normalizedDirectory
    }
    else {
        $env:Path = $normalizedDirectory + ';' + $env:Path.TrimStart(';')
    }

    return $true
}

function Ensure-NpmGlobalBinInEnv {
    param(
        [switch]$OnlyIfAngularCliPresent
    )

    $detailMessages = @()
    $status = 'Déjà installé'

    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -eq $npmCommand) {
        throw "La commande 'npm' est introuvable ; impossible de déterminer le dossier global npm."
    }

    try {
        $npmBinOutput = & npm 'bin' '-g' 2>$null
    }
    catch {
        throw "Impossible d'exécuter 'npm bin -g' : $($_.Exception.Message)"
    }

    if ($null -eq $npmBinOutput -or $npmBinOutput.Count -eq 0) {
        throw "La commande 'npm bin -g' n'a renvoyé aucun chemin."
    }

    $globalNpmPath = ($npmBinOutput | Select-Object -First 1)
    $globalNpmPath = [string]$globalNpmPath
    $globalNpmPath = $globalNpmPath.Trim()

    if ([string]::IsNullOrWhiteSpace($globalNpmPath)) {
        throw "Le chemin renvoyé par 'npm bin -g' est vide."
    }

    $normalizedGlobalPath = Normalize-PathValue -PathValue $globalNpmPath

    if ([string]::IsNullOrWhiteSpace($normalizedGlobalPath)) {
        throw "Le dossier global npm obtenu n'est pas valide."
    }

    if ($OnlyIfAngularCliPresent) {
        $angularCliCandidates = @(
            Join-Path -Path $normalizedGlobalPath -ChildPath 'ng.cmd',
            Join-Path -Path $normalizedGlobalPath -ChildPath 'ng.ps1',
            Join-Path -Path $normalizedGlobalPath -ChildPath 'ng'
        )

        $angularCliPresent = $false
        foreach ($candidate in $angularCliCandidates) {
            if (Test-Path -LiteralPath $candidate) {
                $angularCliPresent = $true
                break
            }
        }

        if (-not $angularCliPresent) {
            $detailMessages += "Angular CLI n'est pas installé globalement ; aucune modification du PATH n'est effectuée avant son installation."

            $detailsText = ($detailMessages | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ' '
            if ([string]::IsNullOrWhiteSpace($detailsText)) {
                $detailsText = $null
            }

            return [PSCustomObject]@{
                Status  = 'Validé'
                Details = $detailsText
            }
        }
    }

    if (-not (Test-Path -LiteralPath $normalizedGlobalPath)) {
        try {
            New-Item -ItemType Directory -Path $normalizedGlobalPath -Force | Out-Null
            $detailMessages += "Création du dossier global npm ($normalizedGlobalPath)."
            $status = 'Mis à jour'
        }
        catch {
            throw "Impossible de créer le dossier npm global '$normalizedGlobalPath' : $($_.Exception.Message)"
        }
    }

    $sessionPathValue = $env:Path
    $sessionContains = $false

    if (-not [string]::IsNullOrWhiteSpace($sessionPathValue)) {
        foreach ($entry in ($sessionPathValue -split ';')) {
            if ([string]::IsNullOrWhiteSpace($entry)) {
                continue
            }

            if ((Normalize-PathValue -PathValue $entry) -eq $normalizedGlobalPath) {
                $sessionContains = $true
                break
            }
        }
    }

    if (-not $sessionContains) {
        if ([string]::IsNullOrWhiteSpace($sessionPathValue)) {
            $env:Path = $normalizedGlobalPath
        }
        else {
            $env:Path = $normalizedGlobalPath + ';' + $sessionPathValue.TrimStart(';')
        }

        $detailMessages += "Ajout du dossier npm global au PATH de la session courante."
        $status = 'Mis à jour'
    }
    else {
        $detailMessages += "Le PATH de la session contient déjà le dossier npm global."
    }

    $userPathValue = [Environment]::GetEnvironmentVariable('Path', 'User')
    $userContains = $false

    if (-not [string]::IsNullOrWhiteSpace($userPathValue)) {
        foreach ($entry in ($userPathValue -split ';')) {
            if ([string]::IsNullOrWhiteSpace($entry)) {
                continue
            }

            if ((Normalize-PathValue -PathValue $entry) -eq $normalizedGlobalPath) {
                $userContains = $true
                break
            }
        }
    }

    if (-not $userContains) {
        $newUserPathValue = $userPathValue

        if ([string]::IsNullOrWhiteSpace($newUserPathValue)) {
            $newUserPathValue = $normalizedGlobalPath
        }
        else {
            $trimmedUserPath = $newUserPathValue.Trim()
            $trimmedUserPath = $trimmedUserPath.TrimEnd(';')

            if ([string]::IsNullOrWhiteSpace($trimmedUserPath)) {
                $newUserPathValue = $normalizedGlobalPath
            }
            else {
                $newUserPathValue = $trimmedUserPath + ';' + $normalizedGlobalPath
            }
        }

        [Environment]::SetEnvironmentVariable('Path', $newUserPathValue, 'User')
        $detailMessages += "Ajout du dossier npm global au PATH utilisateur persistant."
        $status = 'Mis à jour'
    }
    else {
        $detailMessages += "Le PATH utilisateur contient déjà le dossier npm global."
    }

    $detailsText = ($detailMessages | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ' '

    if ([string]::IsNullOrWhiteSpace($detailsText)) {
        $detailsText = "Aucune modification nécessaire : $normalizedGlobalPath déjà présent dans le PATH."
    }

    return [PSCustomObject]@{
        Status  = $status
        Details = $detailsText
    }
}

Invoke-CriticalStep -Description "Ajout du dossier npm global au PATH" -Action {
    return Ensure-NpmGlobalBinInEnv -OnlyIfAngularCliPresent
}

Invoke-CriticalStep -Description "Installation ou mise à niveau de Yarn" -Action {
    $detailMessages = @()
    $status = 'Déjà installé'

    $yarnVersionCheck = Invoke-YarnVersionCheck

    if (-not $yarnVersionCheck.Success) {
        Write-Host "Installation de Yarn via npm..."
        $detailMessages += "Yarn n'est pas disponible dans le chemin courant ; installation globale via npm."
        if ($null -ne $yarnVersionCheck.Error) {
            $detailMessages += "La tentative d'exécuter 'yarn --version' a échoué : $($yarnVersionCheck.Error.Exception.Message)."
        }

        npm install -g yarn

        $postInstallCheck = Invoke-YarnVersionCheck
        if ($postInstallCheck.Success -and $postInstallCheck.Version) {
            Write-Host "Yarn installé : version $($postInstallCheck.Version)"
            $detailMessages += "Yarn a été installé et signale désormais la version $($postInstallCheck.Version)."
        }
        elseif ($postInstallCheck.Success) {
            Write-Host "Yarn vient d'être installé via npm."
            $detailMessages += "Yarn a été installé via npm, mais 'yarn --version' n'a pas fourni de sortie immédiatement."
        }
        else {
            Write-Host "Yarn a été installé via npm, mais 'yarn --version' a toujours échoué : $($postInstallCheck.Error.Exception.Message)"
            $detailMessages += "Après l'installation via npm, la commande 'yarn --version' a échoué : $($postInstallCheck.Error.Exception.Message)."
        }

        $status = 'Installé'
    }
    else {
        if ($yarnVersionCheck.Version) {
            Write-Host "Yarn détecté : version $($yarnVersionCheck.Version)"
            $detailMessages += "Yarn est déjà installé globalement (version $($yarnVersionCheck.Version))."
        }
        else {
            Write-Host "Yarn détecté."
            $detailMessages += "Yarn est déjà installé globalement, mais 'yarn --version' n'a pas fourni de sortie immédiate."
        }
    }

    $detailsText = ($detailMessages -join " ").Trim()
    if ([string]::IsNullOrWhiteSpace($detailsText)) {
        $detailsText = $null
    }

    return [PSCustomObject]@{
        Status  = $status
        Details = $detailsText
    }
}

Invoke-CriticalStep -Description "Installation ou mise à niveau de mkcert" -Action {
    $detailMessages = @()
    $status = 'Déjà installé'
    $mkcertExecutable = Resolve-MkcertExecutable

    if ([string]::IsNullOrWhiteSpace($mkcertExecutable)) {
        Write-Host "Installation de mkcert via winget..."
        winget install --exact --id FiloSottile.mkcert --silent --accept-source-agreements --accept-package-agreements
        $status = 'Installé'
        $detailMessages += "mkcert n'était pas disponible ; installation via winget."
        $mkcertExecutable = Resolve-MkcertExecutable

        if ([string]::IsNullOrWhiteSpace($mkcertExecutable)) {
            throw "mkcert a été installé via winget, mais l'exécutable reste introuvable dans cette session."
        }
    }
    else {
        $detailMessages += "mkcert est déjà disponible sur cette machine."
    }

    $mkcertDirectory = Split-Path -Parent $mkcertExecutable
    if (-not [string]::IsNullOrWhiteSpace($mkcertDirectory)) {
        $pathUpdated = Add-DirectoryToSessionPath -DirectoryPath $mkcertDirectory
        if ($pathUpdated) {
            $detailMessages += "Le dossier de mkcert a été ajouté au PATH de la session courante."
            if ($status -eq 'Déjà installé') {
                $status = 'Mis à jour'
            }
        }
    }

    $mkcertVersion = & $mkcertExecutable '--version'
    if ($mkcertVersion) {
        $mkcertVersion = ([string]$mkcertVersion).Trim()
        Write-Host "mkcert détecté : $mkcertVersion"
        $detailMessages += "La commande mkcert répond avec la version $mkcertVersion."
    }

    $detailsText = ($detailMessages | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ' '
    if ([string]::IsNullOrWhiteSpace($detailsText)) {
        $detailsText = $null
    }

    return [PSCustomObject]@{
        Status  = $status
        Details = $detailsText
    }
}

Invoke-CriticalStep -Description "Installation de l'Angular CLI" -Action {
    $detailMessages = @()
    $angularCli = Get-Command ng -ErrorAction SilentlyContinue
    $status = 'Déjà installé'

    if ($null -eq $angularCli) {
        Write-Host "Installation de @angular/cli via npm..."
        $detailMessages += "La commande 'ng' est absente ; installation globale de @angular/cli."
        npm install -g @angular/cli
        $ngVersionAfterInstall = ng version | Select-String -Pattern "Angular CLI" | Select-Object -First 1
        if ($ngVersionAfterInstall) {
            $versionText = $ngVersionAfterInstall.ToString().Trim()
            Write-Host $versionText
            $detailMessages += "Angular CLI a été installé avec succès ($versionText)."
        }
        else {
            $detailMessages += "Angular CLI a été installé via npm, mais 'ng version' n'a pas encore fourni la sortie attendue."
        }
        $status = 'Installé'
    }
    else {
        $ngVersion = ng version | Select-String -Pattern "Angular CLI" | Select-Object -First 1
        if ($ngVersion) {
            $versionText = $ngVersion.ToString().Trim()
            Write-Host $versionText
            $detailMessages += "Angular CLI est déjà disponible ($versionText)."
        }
        else {
            $detailMessages += "Angular CLI semble présent mais 'ng version' n'a pas fourni de sortie exploitable ; réinstallation globale pour garantir la conformité."
            $status = 'Mis à jour'
            npm install -g @angular/cli
            $ngVersionAfterUpdate = ng version | Select-String -Pattern "Angular CLI" | Select-Object -First 1
            if ($ngVersionAfterUpdate) {
                $versionText = $ngVersionAfterUpdate.ToString().Trim()
                Write-Host $versionText
                $detailMessages += "Après réinstallation, Angular CLI répond avec : $versionText."
            }
            else {
                $detailMessages += "Après réinstallation, 'ng version' ne renvoie toujours pas la sortie attendue."
            }
        }
    }

    $ensurePathResult = Ensure-NpmGlobalBinInEnv
    if ($ensurePathResult -and $ensurePathResult.Details) {
        $detailMessages += $ensurePathResult.Details
    }
    if ($status -eq 'Déjà installé' -and $ensurePathResult -and $ensurePathResult.Status -eq 'Mis à jour') {
        $status = 'Mis à jour'
    }

    $detailsText = ($detailMessages -join " ").Trim()
    if ([string]::IsNullOrWhiteSpace($detailsText)) {
        $detailsText = $null
    }

    return [PSCustomObject]@{
        Status  = $status
        Details = $detailsText
    }
}

Invoke-CriticalStep -Description "Installation des dépendances JavaScript du projet" -Action {
    $packageJsonPath = Join-Path -Path $scriptDirectory -ChildPath 'package.json'
    if (-not (Test-Path -Path $packageJsonPath)) {
        throw "Le fichier package.json est introuvable. Vérifiez que vous exécutez le script depuis la racine du dépôt."
    }

    yarn install --frozen-lockfile

    return [PSCustomObject]@{
        Status  = 'Installé'
        Details = "Les dépendances Yarn ont été installées via 'yarn install --frozen-lockfile'."
    }
}

Invoke-CriticalStep -Description "Génération du certificat HTTPS local pour Angular" -Action {
    $detailMessages = @()
    $angularProjectPath = Join-Path -Path $scriptDirectory -ChildPath 'openg7-org'
    $certScriptPath = Join-Path -Path $angularProjectPath -ChildPath 'scripts\ensure-localhost-cert.mjs'
    $certPath = Join-Path -Path $angularProjectPath -ChildPath '.cert\localhost.pem'
    $keyPath = Join-Path -Path $angularProjectPath -ChildPath '.cert\localhost-key.pem'

    if (-not (Test-Path -Path $certScriptPath)) {
        throw "Le script de génération du certificat est introuvable : $certScriptPath"
    }

    & node $certScriptPath
    $certExitCode = $LASTEXITCODE
    if ($certExitCode -ne 0) {
        throw "La génération du certificat a échoué avec le code $certExitCode."
    }

    if (-not (Test-Path -Path $certPath) -or -not (Test-Path -Path $keyPath)) {
        throw "Le certificat HTTPS n'a pas été généré correctement dans $angularProjectPath\.cert."
    }

    $detailMessages += "Le certificat HTTPS local a été généré dans $angularProjectPath\.cert pour la configuration Angular https-local."

    return [PSCustomObject]@{
        Status  = 'Installé'
        Details = (($detailMessages | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ' ')
    }
}

Write-Host ""
Write-Host "Toutes les étapes d'installation se sont terminées avec succès."
Show-StepSummary

$packageJsonPath = Join-Path -Path $scriptDirectory -ChildPath 'package.json'
$scriptDefinitions = @{}

if (Test-Path -Path $packageJsonPath) {
    try {
        $packageJson = Get-Content -Path $packageJsonPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop

        if ($packageJson -and $packageJson.PSObject.Properties['scripts']) {
            foreach ($property in $packageJson.scripts.PSObject.Properties) {
                $scriptDefinitions[$property.Name] = [string]$property.Value
            }
        }
    }
    catch {
        Write-Host "⚠️ Impossible de lire package.json : $($_.Exception.Message)"
    }
}
else {
    Write-Host "⚠️ Le fichier package.json est introuvable ; aucun script supplémentaire ne sera proposé."
}

$menuOptions = @()
$preferredOrder = @('dev:web', 'dev:cms', 'dev:all', 'codegen')
$orderedScripts = @()

foreach ($scriptName in $preferredOrder) {
    if ($scriptDefinitions.ContainsKey($scriptName)) {
        $orderedScripts += $scriptName
    }
}

foreach ($scriptName in ($scriptDefinitions.Keys | Where-Object { $preferredOrder -notcontains $_ } | Sort-Object)) {
    if ($orderedScripts -notcontains $scriptName) {
        $orderedScripts += $scriptName
    }
}

foreach ($scriptName in $orderedScripts) {
    $scriptCommand = $scriptDefinitions[$scriptName]
    $label = if ([string]::IsNullOrWhiteSpace($scriptCommand)) { "yarn $scriptName" } else { "yarn $scriptName — $scriptCommand" }
    $menuOptions += [PSCustomObject]@{
        Label = $label
        Value = $scriptName
    }
}

$menuOptions += [PSCustomObject]@{
    Label = 'Ne rien faire (fermer la console)'
    Value = 'exit'
}

$selectedOption = Read-MenuSelection -Options $menuOptions -Prompt 'Quelle action souhaitez-vous exécuter ? Utilisez ↑/↓ puis Entrée.'
$selectedValue = $selectedOption.Value

if ($null -eq $selectedValue) {
    $selectedValue = 'exit'
}

if ($selectedValue -eq 'exit') {
    exit 0
}

if ($selectedValue -eq 'dev:web') {
    $angularProjectPath = Join-Path -Path $scriptDirectory -ChildPath 'openg7-org'

    if (-not (Test-Path -Path $angularProjectPath)) {
        Write-Host "❌ Le dossier du projet Angular est introuvable ($angularProjectPath). Impossible de démarrer l'application."
        Wait-ForUserConfirmationToClose -Message "Le lancement automatique a échoué. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
        exit 1
    }

    Write-Host ""
    Write-Host "=== Build de l'application Angular (openg7-org) ==="

    try {
        & yarn '--cwd' $angularProjectPath 'build'
        $buildExitCode = $LASTEXITCODE
        if ($buildExitCode -ne 0) {
            throw "La commande 'yarn --cwd `"$angularProjectPath`" build' s'est terminée avec le code $buildExitCode."
        }

        Write-Host "Le build s'est terminé avec succès."
    }
    catch {
        Write-Host "❌ Échec du build Angular : $($_.Exception.Message)"
        Wait-ForUserConfirmationToClose -Message "Une erreur est survenue lors du build. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
        exit 1
    }

    Write-Host ""
    Write-Host "=== Démarrage du serveur de développement Angular ==="
    Write-Host "Le serveur démarre dans cette fenêtre. Appuyez sur Ctrl+C pour l'arrêter lorsque vous avez terminé."

    try {
        $locationPushed = $false
        try {
            Push-Location -Path $angularProjectPath
            $locationPushed = $true
            & npm 'run' 'dev:web'
            $serveExitCode = $LASTEXITCODE
        }
        finally {
            if ($locationPushed) {
                Pop-Location
            }
        }

        switch ($serveExitCode) {
            0 {
                Write-Host "Le serveur s'est arrêté proprement."
            }
            130 {
                Write-Host "Serveur interrompu par l'utilisateur (Ctrl+C)."
            }
            -1073741510 {
                Write-Host "Serveur interrompu par l'utilisateur (Ctrl+C)."
            }
            default {
                throw "Le serveur s'est arrêté avec le code $serveExitCode."
            }
        }
    }
    catch {
        Write-Host "❌ Le démarrage du serveur Angular a échoué : $($_.Exception.Message)"
        Wait-ForUserConfirmationToClose -Message "Une erreur est survenue lors du démarrage. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
        exit 1
    }

    Wait-ForUserConfirmationToClose -Message "Serveur arrêté. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
    exit 0
}

Write-Host ""
Write-Host ("=== Exécution de 'yarn {0}' ===" -f $selectedValue)
Write-Host "La commande s'exécute dans cette fenêtre. Appuyez sur Ctrl+C pour l'interrompre si nécessaire."

try {
    & yarn $selectedValue
    $commandExitCode = $LASTEXITCODE

    switch ($commandExitCode) {
        0 {
            Write-Host "La commande s'est terminée avec succès."
            $waitMessage = "Commande terminée. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
        }
        130 {
            Write-Host "Commande interrompue par l'utilisateur (Ctrl+C)."
            $waitMessage = "Commande interrompue par l'utilisateur. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
        }
        -1073741510 {
            Write-Host "Commande interrompue par l'utilisateur (Ctrl+C)."
            $waitMessage = "Commande interrompue par l'utilisateur. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
        }
        default {
            throw "La commande 'yarn $selectedValue' s'est arrêtée avec le code $commandExitCode."
        }
    }
}
catch {
    Write-Host "❌ L'exécution de 'yarn $selectedValue' a échoué : $($_.Exception.Message)"
    Wait-ForUserConfirmationToClose -Message "Une erreur est survenue. Appuyez sur une touche pour fermer cette fenêtre / Press any key to close this window..."
    exit 1
}

Wait-ForUserConfirmationToClose -Message $waitMessage
exit 0
