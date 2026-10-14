import { apiFetch } from './api';

export async function downloadReport(endpoint, filename) {
    try {
        const response = await apiFetch(endpoint);
        if (!response.ok) {
            let errorMsg = 'Failed to download report';
            try {
                const data = await response.json();
                if (data.message) errorMsg = data.message;
            } catch (e) {
                // Ignore json parse error for non-json responses
            }
            alert(errorMsg);
            return false;
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || 'scrape_report.csv';
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        link.remove();
        return true;
    } catch (err) {
        console.error('Download error:', err);
        alert('Could not download report file.');
        return false;
    }
}
