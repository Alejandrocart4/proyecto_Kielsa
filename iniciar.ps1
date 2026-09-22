$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (Get-Command py -ErrorAction SilentlyContinue) {
    $python = "py"
    $pythonArgs = @("-3")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $python = "python"
    $pythonArgs = @()
} else {
    throw "Instala Python 3.11 o superior desde https://www.python.org/downloads/ y vuelve a ejecutar este archivo."
}

& $python @pythonArgs -m pip install -r requirements.txt
& $python @pythonArgs app.py
