<?php

namespace App\Services;

use OpenSpout\Writer\XLSX\Writer;
use OpenSpout\Common\Entity\Row;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExcelExportService
{
    public function exportIncompleteProfiles($data, $fileName)
    {
        $response = new StreamedResponse(function() use ($data) {
            $writer = new Writer();
            $writer->openToBrowser('php://output');
            
            // Header row (tanpa style dulu)
            $headers = ['NIK', 'Nama Karyawan', 'Section', 'Subsection', 'Kecamatan', 'Kelurahan', 'Status Kelengkapan Data'];
            $writer->addRow(Row::fromValues($headers));
            
            // Data rows
            foreach ($data as $rowData) {
                $writer->addRow(Row::fromValues($rowData));
            }
            
            $writer->close();
        });
        
        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $fileName . '"');
        $response->headers->set('Cache-Control', 'max-age=0');
        
        return $response;
    }
}