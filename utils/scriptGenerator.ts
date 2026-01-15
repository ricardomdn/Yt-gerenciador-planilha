import { CostItem } from '../types';

export const generateGASCode = (channelId: string, costs: CostItem[]): string => {
  
  const longCosts = costs.filter(c => c.type === 'long');
  const shortCosts = costs.filter(c => c.type === 'short');

  // Helpers
  const getVideoHeaders = (specificCosts: CostItem[]) => {
    const costHeaders = specificCosts.map(c => `"${c.role}"`);
    const allHeaders = [
      '"Data"', '"Título"', '"Link"', '"Visualizações"', 
      ...costHeaders, 
      '"Custo Total Vídeo"'
    ];
    return `[${allHeaders.join(', ')}]`;
  };

  const getCostConfig = (specificCosts: CostItem[]) => {
    return JSON.stringify(specificCosts.map(c => ({ role: c.role, value: c.value })), null, 2);
  };

  // --- CONSTANTS ---
  const DATA_START_ROW = 5;
  const longTotalColIndex = 5 + longCosts.length;
  const shortTotalColIndex = 5 + shortCosts.length;

  return `/**
 * AUTOMAÇÃO YOUTUBE PRO
 * Gerado em: ${new Date().toLocaleDateString('pt-BR')}
 */

const CHANNEL_ID_OR_HANDLE = "${channelId.trim()}";
const SHEET_DASHBOARD = "Dashboard";
const SHEET_LONG = "Videos_Longos"; 
const SHEET_SHORTS = "Shorts";

// Configuração de Custos
const COSTS_LONG = ${getCostConfig(longCosts)};
const COSTS_SHORTS = ${getCostConfig(shortCosts)};

// Índices das colunas de Custo Total
const COL_TOTAL_LONG = ${longTotalColIndex};
const COL_TOTAL_SHORT = ${shortTotalColIndex};

const DATA_START_ROW = 5; 

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  ss.setSpreadsheetLocale('pt_BR');
  ss.setSpreadsheetTimeZone('America/Sao_Paulo');
  
  // 1. Cria abas
  setupDashboard(ss);
  setupVideoSheet(ss, SHEET_LONG, ${getVideoHeaders(longCosts)}, ${longCosts.length});
  setupVideoSheet(ss, SHEET_SHORTS, ${getVideoHeaders(shortCosts)}, ${shortCosts.length});
  
  // Limpeza
  const defaultSheet = ss.getSheetByName('Página1');
  if (defaultSheet && defaultSheet.getLastRow() === 0) ss.deleteSheet(defaultSheet);

  // 2. Configura Gatilho
  autoTriggerSetup();
  
  // 3. Executa a carga inicial
  fetchYouTubeData();
}

function setupDashboard(ss) {
  let sheet = ss.getSheetByName(SHEET_DASHBOARD);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DASHBOARD, 0);
  }

  const headers = ["Mês", "Ano", "Faturamento (Manual)", "Custos (Longos)", "Custos (Shorts)", "Lucro Líquido"];
  
  sheet.getRange("A1:F1").setValues([headers])
       .setBackground("#111827")
       .setFontColor("#fbbf24")
       .setFontWeight("bold")
       .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 60);
  sheet.setColumnWidth(2, 60);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 150);
  sheet.getRange("C:F").setNumberFormat("R$ #,##0.00");
  sheet.getRange("A:B").setHorizontalAlignment("center");
  sheet.getRange("C:C").setBackground("#fffbeb"); 

  // Insere linha do mês atual se estiver vazia
  if (sheet.getLastRow() === 1) {
    const today = new Date();
    sheet.getRange(2, 1).setValue(today.getMonth() + 1);
    sheet.getRange(2, 2).setValue(today.getFullYear());
    sheet.getRange(2, 3).setValue(0);
    sheet.getRange(2, 6).setFormula('=C2 - D2 - E2');
  }
}

function setupVideoSheet(ss, sheetName, headers, costCount) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Headers Data
  const headerRow = 4;
  sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers])
       .setBackground("#1f2937") 
       .setFontColor("#e5e7eb")
       .setFontWeight("bold")
       .setHorizontalAlignment("center");
       
  sheet.setFrozenRows(headerRow); 
  
  // Formatação
  sheet.getRange("A" + DATA_START_ROW + ":A").setNumberFormat("dd/MM/yyyy");
  sheet.getRange("D" + DATA_START_ROW + ":D").setNumberFormat("#,##0"); 
  
  const totalCostColIndex = 5 + costCount;
  if (totalCostColIndex >= 5) {
     const startLetter = columnToLetter(5);
     const endLetter = columnToLetter(totalCostColIndex);
     sheet.getRange(startLetter + DATA_START_ROW + ":" + endLetter).setNumberFormat("R$ #,##0.00");
  }

  // Cabeçalho Grande
  const totalCostLetter = columnToLetter(totalCostColIndex);
  const lastColLetter = columnToLetter(headers.length);

  sheet.getRange("A1:" + lastColLetter + "1").merge()
       .setValue("ACUMULADO TOTAL (" + sheetName.toUpperCase() + ")")
       .setBackground("#374151")
       .setFontColor("#ffffff")
       .setFontWeight("bold")
       .setHorizontalAlignment("center");

  // Fórmula Simples (Soma da coluna inteira) para o Header
  const sumFormula = "=SUM(" + totalCostLetter + DATA_START_ROW + ":" + totalCostLetter + ")";
  sheet.getRange("A2:" + lastColLetter + "2").merge()
       .setFormula(sumFormula)
       .setNumberFormat("R$ #,##0.00")
       .setBackground(sheetName === SHEET_SHORTS ? "#991b1b" : "#166534")
       .setFontColor("#ffffff")
       .setFontSize(18)
       .setFontWeight("bold")
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");
       
  sheet.setRowHeight(2, 60);
}

function autoTriggerSetup() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'fetchYouTubeData') ScriptApp.deleteTrigger(t);
  });
  
  ScriptApp.newTrigger('fetchYouTubeData')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
}

function fetchYouTubeData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    let targetChannelId = resolveChannelId(CHANNEL_ID_OR_HANDLE);
    if (!targetChannelId) return;

    const results = YouTube.Search.list('id,snippet', {
      channelId: targetChannelId,
      maxResults: 50,
      order: 'date',
      type: 'video'
    });
    
    if (results.items && results.items.length > 0) {
      const videoIds = results.items.map(item => item.id.videoId).join(',');
      const stats = YouTube.Videos.list('snippet,statistics,contentDetails', { id: videoIds });
      
      processVideos(ss, stats.items);
    }

    // Atualiza os totais do Dashboard
    updateDashboardTotals(ss);
    
    SpreadsheetApp.flush();
    
  } catch (e) {
    Logger.log("Erro: " + e.toString());
  }
}

function processVideos(ss, videos) {
  videos.forEach(video => {
      const durationSec = parseISO8601Duration(video.contentDetails.duration);
      const isShort = durationSec <= 65; 
      
      const targetSheetName = isShort ? SHEET_SHORTS : SHEET_LONG;
      const sheet = ss.getSheetByName(targetSheetName);
      if (!sheet) return; 

      const configCosts = isShort ? COSTS_SHORTS : COSTS_LONG;
      
      const lastRow = sheet.getLastRow();
      const hasData = lastRow >= DATA_START_ROW; 
      
      let existingLinks = [];
      if (hasData) {
         existingLinks = sheet.getRange(DATA_START_ROW, 3, lastRow - DATA_START_ROW + 1, 1).getValues().flat();
      }
      
      const videoUrl = "https://www.youtube.com/watch?v=" + video.id;
      const viewCount = video.statistics.viewCount || 0;
      const existingIndex = existingLinks.indexOf(videoUrl);

      if (existingIndex === -1) {
        // Novo vídeo
        const rowCosts = configCosts.map(c => c.value);
        const rowData = [
          new Date(video.snippet.publishedAt),
          video.snippet.title,
          videoUrl,
          viewCount,
          ...rowCosts,
          "" // Placeholder
        ];
        
        sheet.appendRow(rowData);
        const newRow = sheet.getLastRow();
        
        // Fórmula de soma horizontal
        if (configCosts.length > 0) {
            const startCostLetter = columnToLetter(5);
            const endCostLetter = columnToLetter(5 + configCosts.length - 1);
            const totalColIndex = 5 + configCosts.length;
            const formula = "=SUM(" + startCostLetter + newRow + ":" + endCostLetter + newRow + ")";
            sheet.getRange(newRow, totalColIndex).setFormula(formula);
        } else {
             const totalColIndex = 5;
             sheet.getRange(newRow, totalColIndex).setValue(0);
        }
      } else {
        // Atualiza views
        const rowToUpdate = DATA_START_ROW + existingIndex;
        sheet.getRange(rowToUpdate, 4).setValue(viewCount);
      }
  });
}

/**
 * Atualiza o Dashboard calculando via Script
 */
function updateDashboardTotals(ss) {
  const dash = ss.getSheetByName(SHEET_DASHBOARD);
  if (!dash) return;
  
  const lastRow = dash.getLastRow();
  if (lastRow < 2) return; 
  
  const numRows = lastRow - 2 + 1;
  const rangeDates = dash.getRange(2, 1, numRows, 2);
  const dashDates = rangeDates.getValues(); 
  
  const longTotals = calculateTotalsByMonth(ss.getSheetByName(SHEET_LONG), COL_TOTAL_LONG);
  const shortTotals = calculateTotalsByMonth(ss.getSheetByName(SHEET_SHORTS), COL_TOTAL_SHORT);
  
  const valuesToUpdate = [];
  
  for (let i = 0; i < dashDates.length; i++) {
     const month = dashDates[i][0];
     const year = dashDates[i][1];
     const key = month + "-" + year;
     
     const valLong = longTotals[key] || 0;
     const valShort = shortTotals[key] || 0;
     
     valuesToUpdate.push([valLong, valShort]);
     
     dash.getRange(2 + i, 6).setFormula('=C' + (2+i) + ' - D' + (2+i) + ' - E' + (2+i));
  }
  
  if (valuesToUpdate.length > 0) {
    dash.getRange(2, 4, valuesToUpdate.length, 2).setValues(valuesToUpdate);
  }
}

function calculateTotalsByMonth(sheet, costColIndex) {
  const totals = {}; 
  if (!sheet) return totals;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return totals;
  
  const numRows = lastRow - DATA_START_ROW + 1;
  
  const dates = sheet.getRange(DATA_START_ROW, 1, numRows, 1).getValues();
  const costs = sheet.getRange(DATA_START_ROW, costColIndex, numRows, 1).getValues();
  
  for (let i = 0; i < numRows; i++) {
     const rawDate = dates[i][0];
     const cost = costs[i][0];
     
     if (rawDate instanceof Date && typeof cost === 'number') {
        const m = rawDate.getMonth() + 1;
        const y = rawDate.getFullYear();
        const key = m + "-" + y;
        
        if (!totals[key]) totals[key] = 0;
        totals[key] += cost;
     }
  }
  
  return totals;
}

function resolveChannelId(input) {
  if (input.startsWith('@')) {
    try {
      const handleSearch = YouTube.Channels.list('id', { forHandle: input });
      if (handleSearch.items && handleSearch.items.length > 0) return handleSearch.items[0].id;
      const searchRes = YouTube.Search.list('id', { q: input, type: 'channel', maxResults: 1 });
      if (searchRes.items && searchRes.items.length > 0) return searchRes.items[0].id.channelId;
    } catch (e) {}
    return null;
  }
  return input;
}

function parseISO8601Duration(duration) {
  var regex = /PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?/;
  var matches = duration.match(regex);
  if (!matches) return 0;
  var hours = parseInt(matches[1] || "0", 10);
  var minutes = parseInt(matches[2] || "0", 10);
  var seconds = parseInt(matches[3] || "0", 10);
  return (hours * 3600) + (minutes * 60) + seconds;
}

function columnToLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}`;
};