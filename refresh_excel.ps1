
$ErrorActionPreference = "Stop"

$excelPath = Join-Path $PSScriptRoot "prsk_music_list.xlsx"

if (-not (Test-Path $excelPath)) {
    throw "Excel file not found: $excelPath"
}

$excel = $null
$workbook = $null

try {
    Write-Host "Starting Excel..."

    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false

    $workbook = $excel.Workbooks.Open($excelPath)

    Write-Host "Workbook: $($workbook.FullName)"

    # Disable background refresh for supported connections
    foreach ($connection in $workbook.Connections) {
        Write-Host "Connection: $($connection.Name)"

        try {
            if ($connection.Type -eq 1) {
                $connection.OLEDBConnection.BackgroundQuery = $false
            }
            elseif ($connection.Type -eq 2) {
                $connection.ODBCConnection.BackgroundQuery = $false
            }
        }
        catch {
            Write-Host "BackgroundQuery setting not supported."
        }
    }

    Write-Host "Refreshing workbook..."

    $workbook.RefreshAll()
    $excel.CalculateUntilAsyncQueriesDone()

    # Refresh worksheet tables synchronously
    foreach ($sheet in $workbook.Worksheets) {

        foreach ($listObject in $sheet.ListObjects) {
            try {
                $queryTable = $listObject.QueryTable

                if ($null -ne $queryTable) {
                    Write-Host "Refreshing table: $($listObject.Name)"

                    $result = $queryTable.Refresh($false)

                    if (-not $result) {
                        throw "Table refresh returned false."
                    }
                }
            }
            catch {
                Write-Host "Table refresh failed: $($_.Exception.Message)"
                throw
            }
        }

        foreach ($queryTable in $sheet.QueryTables) {
            Write-Host "Refreshing query table: $($queryTable.Name)"

            $result = $queryTable.Refresh($false)

            if (-not $result) {
                throw "Query table refresh returned false."
            }
        }
    }

    $excel.CalculateUntilAsyncQueriesDone()

    Write-Host "Saving workbook..."

    $workbook.Save()

    if (-not $workbook.Saved) {
        throw "Workbook was not saved successfully."
    }

    Write-Host "Excel refresh and save completed."
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    throw
}
finally {
    if ($null -ne $workbook) {
        $workbook.Close($false)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
    }

    if ($null -ne $excel) {
        $excel.Quit()
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
    }

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}


