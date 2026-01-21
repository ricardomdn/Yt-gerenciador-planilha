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
 * AUTOMAÇÃO YOUTUBE PRO - V24 (Limpeza de Colunas Fantasmas)
 * 
 * INSTRUÇÕES:
 * 1. No menu lateral esquerdo, clique em "Serviços" (+).
 * 2. Selecione "YouTube Data API v3" e clique em Adicionar.
 * 3. Salve e execute a função 'setup'.
 *
 * MUDANÇAS V24:
 * - Limpeza total de colunas de dados antigas (evita duplicação de totais).
 * - Sincronização visual exata entre banners de Longos e Shorts.
 *
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

// DADOS COMEÇAM NA LINHA 5
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
  
  // Headers Data (Linha 4)
  const headerRow = 4;
  
  // LIMPEZA DE CABEÇALHO (Evita que headers antigos fiquem duplicados)
  try {
     sheet.getRange(headerRow, 1, 1, sheet.getMaxColumns()).clear();
  } catch(e) {}

  sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers])
       .setBackground("#1f2937") 
       .setFontColor("#e5e7eb")
       .setFontWeight("bold")
       .setHorizontalAlignment("center");
       
  sheet.setFrozenRows(headerRow); 
  
  // Formatação Básica da Coluna
  sheet.getRange("A" + DATA_START_ROW + ":A").setNumberFormat("dd/MM/yyyy").setHorizontalAlignment("center");
  sheet.getRange("D" + DATA_START_ROW + ":D").setNumberFormat("#,##0").setHorizontalAlignment("center"); 
  
  const totalCostColIndex = 5 + costCount;
  if (totalCostColIndex >= 5) {
     const startLetter = columnToLetter(5);
     const endLetter = columnToLetter(totalCostColIndex);
     sheet.getRange(startLetter + DATA_START_ROW + ":" + endLetter)
          .setNumberFormat("R$ #,##0.00")
          .setHorizontalAlignment("center");
  }
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

    const channelResponse = YouTube.Channels.list('contentDetails', { id: targetChannelId });
    if (!channelResponse.items || channelResponse.items.length === 0) {
      Logger.log("Canal não encontrado.");
      return;
    }
    const uploadsPlaylistId = channelResponse.items[0].contentDetails.relatedPlaylists.uploads;

    const now = new Date();
    const targetDate = new Date(now.getFullYear(), 0, 1); 
    targetDate.setHours(0,0,0,0);
    
    let allVideoIds = [];
    let nextPageToken = '';
    let keepFetching = true;

    while (keepFetching) {
        const plItems = YouTube.PlaylistItems.list('snippet,contentDetails', {
           playlistId: uploadsPlaylistId,
           maxResults: 50,
           pageToken: nextPageToken
        });
        
        if (plItems.items && plItems.items.length > 0) {
           for (let i = 0; i < plItems.items.length; i++) {
              const item = plItems.items[i];
              const publishedAt = new Date(item.snippet.publishedAt);
              if (publishedAt >= targetDate) {
                 allVideoIds.push(item.contentDetails.videoId);
              } else {
                 keepFetching = false; 
              }
           }
        } else {
           keepFetching = false;
        }
        
        nextPageToken = plItems.nextPageToken;
        if (!nextPageToken) keepFetching = false;
    }
    
    if (allVideoIds.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < allVideoIds.length; i += chunkSize) {
          const chunkIds = allVideoIds.slice(i, i + chunkSize).join(',');
          if (chunkIds) {
             const stats = YouTube.Videos.list('snippet,statistics,contentDetails', { id: chunkIds });
             if (stats.items) {
                processVideos(ss, stats.items);
             }
          }
      }
    }

    sortSheetByDate(ss.getSheetByName(SHEET_LONG));
    sortSheetByDate(ss.getSheetByName(SHEET_SHORTS));

    SpreadsheetApp.flush();

    // Atualiza custos e FÓRMULAS
    forceUpdateSheetCosts(ss.getSheetByName(SHEET_LONG), COSTS_LONG);
    forceUpdateSheetCosts(ss.getSheetByName(SHEET_SHORTS), COSTS_SHORTS);

    // ATUALIZAÇÃO V24: Flush e lógica unificada
    updateSheetBanner(ss.getSheetByName(SHEET_LONG), COL_TOTAL_LONG, 'long');
    updateSheetBanner(ss.getSheetByName(SHEET_SHORTS), COL_TOTAL_SHORT, 'short');

    updateDashboardTotals(ss);
    SpreadsheetApp.flush();
    
  } catch (e) {
    Logger.log("Erro Fatal: " + e.toString());
  }
}

/**
 * Função V24 - Banner Dinâmico com Limpeza Profunda
 */
function updateSheetBanner(sheet, totalColIndex, type) {
  if (!sheet) return;
  
  // 1. LIMPEZA TOTAL DA ÁREA DO BANNER (A1:Z2)
  var maxCols = sheet.getMaxColumns();
  var topRange = sheet.getRange(1, 1, 2, maxCols);
  
  try {
    topRange.breakApart(); // Remove mesclagens antigas
    topRange.clear();      // Remove TUDO (conteúdo, formato, bordas)
    SpreadsheetApp.flush(); // Aplica a limpeza antes de desenhar
  } catch(e) {}
  
  // 2. Novo Desenho (Sincronizado para ambos os tipos)
  var lastColLetter = columnToLetter(totalColIndex);
  var bannerRange = sheet.getRange("A1:" + lastColLetter + "2");
  
  bannerRange.merge(); // Mescla de A1 até a coluna de Total
  
  // 3. Fórmula e Texto
  var colLetter = columnToLetter(totalColIndex);
  var sumFormula = "=SUM(" + colLetter + DATA_START_ROW + ":" + colLetter + ")";
  
  bannerRange.setFormula(sumFormula);
  
  var label = type === 'short' ? "GASTO TOTAL (SHORTS): " : "GASTO TOTAL (LONGOS): ";
  bannerRange.setNumberFormat('"' + label + '" R$ #,##0.00');
  
  // 4. Estilo (Base idêntica, apenas cores diferentes)
  bannerRange.setFontSize(14)
             .setFontWeight("bold")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  
  if (type === 'short') {
    // SHORTS: Vermelho
    bannerRange.setBackground("#450a0a")
               .setFontColor("#fca5a5")
               .setBorder(true, true, true, true, true, true, "#991b1b", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  } else {
    // LONGOS: Azul Escuro/Verde (Mesma estrutura visual)
    bannerRange.setBackground("#111827")
               .setFontColor("#4ade80")
               .setBorder(true, true, true, true, true, true, "#374151", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }
}

function forceUpdateSheetCosts(sheet, configCosts) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  // Se houver dados (mesmo que seja apenas na linha 5), executamos.
  if (lastRow < DATA_START_ROW) return;

  const numRows = lastRow - DATA_START_ROW + 1;
  const costValues = configCosts.map(c => c.value);
  const numCosts = costValues.length;

  // CORREÇÃO V24: Limpeza de dados antigos (Ghost Columns)
  // Limpa da coluna 5 até o fim da planilha nas linhas de dados
  try {
    const maxCols = sheet.getMaxColumns();
    if (maxCols >= 5) {
       sheet.getRange(DATA_START_ROW, 5, numRows, maxCols - 4).clearContent().clearFormat();
    }
  } catch(e) {}

  if (numCosts > 0) {
    // 1. Atualiza Valores Fixos
    const costsMatrix = [];
    for (let r = 0; r < numRows; r++) {
       costsMatrix.push(costValues);
    }
    sheet.getRange(DATA_START_ROW, 5, numRows, numCosts).setValues(costsMatrix);
    
    // 2. Atualiza FÓRMULAS
    const totalColIndex = 5 + numCosts;
    const startColLetter = columnToLetter(5); // Coluna E
    const endColLetter = columnToLetter(5 + numCosts - 1); 
    
    const formulas = [];
    for (let i = 0; i < numRows; i++) {
        const rowNum = DATA_START_ROW + i;
        formulas.push(["=SUM(" + startColLetter + rowNum + ":" + endColLetter + rowNum + ")"]);
    }
    
    sheet.getRange(DATA_START_ROW, totalColIndex, numRows, 1).setFormulas(formulas);
    
    sheet.getRange(DATA_START_ROW, 5, numRows, numCosts + 1)
         .setNumberFormat("R$ #,##0.00")
         .setHorizontalAlignment("center");

  } else {
     // Caso sem custos, zera a primeira coluna de dados (E)
     sheet.getRange(DATA_START_ROW, 5, numRows, 1).setValue(0).setHorizontalAlignment("center");
  }
}

function sortSheetByDate(sheet) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return;
  const lastCol = sheet.getLastColumn();
  const numRows = lastRow - DATA_START_ROW + 1;
  const range = sheet.getRange(DATA_START_ROW, 1, numRows, lastCol);
  range.sort({column: 1, ascending: true});
}

function processVideos(ss, videos) {
  if (!videos || videos.length === 0) return;

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
        // --- NOVO VÍDEO ---
        const rowCosts = configCosts.map(c => c.value);
        const rowData = [
          new Date(video.snippet.publishedAt),
          video.snippet.title,
          videoUrl,
          viewCount, 
          ...rowCosts,
          "" 
        ];
        
        sheet.appendRow(rowData);
        const newRow = sheet.getLastRow();
        
        sheet.getRange(newRow, 1).setNumberFormat("dd/MM/yyyy").setHorizontalAlignment("center");
        sheet.getRange(newRow, 2).setHorizontalAlignment("left");
        sheet.getRange(newRow, 3).setHorizontalAlignment("left");
        sheet.getRange(newRow, 4).setNumberFormat("#,##0").setHorizontalAlignment("center");

        // Insere Fórmula Explícita
        if (configCosts.length > 0) {
            const totalColIndex = 5 + configCosts.length;
            const startColLetter = columnToLetter(5);
            const endColLetter = columnToLetter(5 + configCosts.length - 1);
            
            const formula = "=SUM(" + startColLetter + newRow + ":" + endColLetter + newRow + ")";
            sheet.getRange(newRow, totalColIndex).setFormula(formula);
            
            sheet.getRange(newRow, 5, 1, configCosts.length + 1)
                 .setNumberFormat("R$ #,##0.00")
                 .setHorizontalAlignment("center");
        } else {
             const totalColIndex = 5;
             sheet.getRange(newRow, totalColIndex).setValue(0).setHorizontalAlignment("center");
        }
      } else {
        const rowToUpdate = DATA_START_ROW + existingIndex;
        sheet.getRange(rowToUpdate, 4).setValue(viewCount).setNumberFormat("#,##0").setHorizontalAlignment("center");
      }
  });
}

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
