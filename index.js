
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

console.log("App loaded. Main button and nav link updated for Google Form integration.");

const monthNamesPT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Function to update table headers with dynamic month names
function updateTableHeaders() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed (0 for January, 11 for December)

  const nextMonthIndex = (currentMonth + 1) % 12;
  const monthAfterNextIndex = (currentMonth + 2) % 12;

  const nextMonthName = monthNamesPT[nextMonthIndex];
  const monthAfterNextName = monthNamesPT[monthAfterNextIndex];

  const headers = document.querySelectorAll('table thead th');
  if (headers.length >= 4) {
    // The 3rd header (index 2) should display "Status (Mês Seguinte ao Atual)"
    // The 4th header (index 3) should display "Status (Mês Dois Meses Após o Atual)"
    headers[2].textContent = `Status (${nextMonthName})`;
    headers[3].textContent = `Status (${monthAfterNextName})`;
    console.log(`Table headers updated to Status (${nextMonthName}) and Status (${monthAfterNextName})`);
  } else {
    console.warn("Could not find enough table headers to update month names.");
  }
}


// Function to fetch and display data from Google Apps Script Web App
async function loadTableData() {
  // ------------------------------------------------------------------------------------
  // IMPORTANTE: Substitua a URL abaixo pela URL do seu Web App do Google Apps Script
  // que você copiou após a implantação.
  // ------------------------------------------------------------------------------------
  const webAppBaseUrl = 'https://script.google.com/macros/s/AKfycbyxalqMO7KxirxbYDsTJVrhv3qhQ3KYlR94VWBwVX_J59lSMetI4Z9yg2EuSS0d_dB6/exec'; 
  
  // Add a cache-busting query parameter
  const webAppUrl = `${webAppBaseUrl}?_=${new Date().getTime()}`;

  console.log(`Fetching data from Web App: ${webAppUrl}`);

  try {
    const response = await fetch(webAppUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();

    if (jsonData.error) {
        console.error("Error from Web App:", jsonData.error, jsonData.details || '');
        throw new Error(`Web App error: ${jsonData.error}${jsonData.details ? ' - ' + jsonData.details : ''}`);
    }
    
    const rows = jsonData.data; // The Apps Script returns an object like { data: [...] }

    if (!Array.isArray(rows)) {
        console.error("Data from Web App is not an array:", rows);
        throw new Error("Invalid data format from Web App. Expected an array in 'data' property.");
    }

    const tableBody = document.querySelector('table tbody');
    if (!tableBody) {
        console.error("Table body not found!");
        return;
    }

    tableBody.innerHTML = ''; 

    if (rows.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum dado encontrado na planilha.</td></tr>';
      return;
    }

    rows.forEach(rowData => {
      const designacao = rowData['Designação'] || '';
      const responsavel = rowData['Responsável(is)'] || '';
      // These keys MUST match the column names in your Google Sheet
      const statusAtualRaw = rowData['Status (Mês Atual)'] || ''; 
      const statusProximoRaw = rowData['Status (Próximo Mês)'] || '';
      const linkEnvioData = rowData['Link do Último Envio'];

      let statusAtualClass = '';
      const statusAtualLower = statusAtualRaw.toLowerCase();
      if (statusAtualLower === 'pendente' || statusAtualLower === 'pending') {
        statusAtualClass = 'status-pending';
      } else if (statusAtualLower === 'entregue' || statusAtualLower === 'delivered') {
        statusAtualClass = 'status-delivered';
      }

      let statusProximoClass = '';
      const statusProximoLower = statusProximoRaw.toLowerCase();
      if (statusProximoLower === 'pendente' || statusProximoLower === 'pending') {
        statusProximoClass = 'status-pending';
      } else if (statusProximoLower === 'entregue' || statusProximoLower === 'delivered') {
        statusProximoClass = 'status-delivered';
      }

      let linkEnvioCellContent = '';
      if (typeof linkEnvioData === 'object' && linkEnvioData !== null && linkEnvioData.text) {
        if (linkEnvioData.url) {
          const url = String(linkEnvioData.url);
          const text = String(linkEnvioData.text);
          // Ensure text is not empty, default to "Ver Link" if it is but URL exists
          const linkText = text || 'Ver Link';
          linkEnvioCellContent = `<a href="${encodeURI(url)}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        } else {
          linkEnvioCellContent = String(linkEnvioData.text); // Just text if no URL
        }
      } else if (typeof linkEnvioData === 'string') { // Fallback for old data or if script sends a string
        linkEnvioCellContent = linkEnvioData;
      } else if (linkEnvioData && linkEnvioData.url && !linkEnvioData.text) { // If only URL is present with no text
         const url = String(linkEnvioData.url);
         linkEnvioCellContent = `<a href="${encodeURI(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }
       else {
        linkEnvioCellContent = ''; // Default for unexpected format or if linkEnvioData is null/undefined
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${designacao}</td>
        <td>${responsavel}</td>
        <td class="${statusAtualClass}">${statusAtualRaw}</td>
        <td class="${statusProximoClass}">${statusProximoRaw}</td>
        <td>${linkEnvioCellContent}</td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (error) {
    console.error("Failed to load table data from Web App:", error);
    const tableBody = document.querySelector('table tbody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar os dados: ${error.message}. Verifique o console para mais detalhes.</td></tr>`;
    }
  }
}

// Function to initialize data loading and set up interval
function initializeDataSync() {
    updateTableHeaders(); // Update headers once on load
    loadTableData(); // Load data immediately on page load
    // Set an interval to refresh data every 2 minutes (120,000 milliseconds)
    // You can adjust this interval if needed. For faster updates with a Web App, 
    // you might even reduce it to 1 minute (60000) or 30 seconds (30000) if usage isn't too high.
    setInterval(loadTableData, 120000); 
}

// Call this function when the page loads.
document.addEventListener('DOMContentLoaded', initializeDataSync);
