
/**
* GSC FLUXO DE CAIXA - BACKEND BRIDGE v2.1
* Suporte para edição e mural de recados
*/

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Establishments
  const estSheet = ss.getSheetByName("Estabelecimentos") || ss.insertSheet("Estabelecimentos");
  const estValues = estSheet.getDataRange().getValues();
  const establishments = estValues.length > 1 ? estValues.slice(1).map(row => ({
    id: String(row[0]),
    name: String(row[1]),
    responsibleEmail: String(row[2])
  })) : [];

  // 2. Get Authorized Users
  const userSheet = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");
  const userValues = userSheet.getDataRange().getValues();
  const authorizedUsers = userValues.length > 1 ? userValues.slice(1).map(row => ({
    email: String(row[1]).toLowerCase().trim(),
    role: String(row[2]) || 'Operador'
  })) : [];

  // 3. Get Transactions
  const transSheet = ss.getSheetByName("Transacoes") || ss.insertSheet("Transacoes");
  const transValues = transSheet.getDataRange().getValues();
  let transactions = [];
  if (transValues.length > 1) {
    transactions = transValues.slice(1).map(row => {
      let d = row[1];
      if (d instanceof Date) d = d.toISOString().split('T')[0];
      return {
        id: String(row[0]),
        date: String(d),
        timestamp: String(row[2]),
        establishmentId: String(row[3]),
        type: String(row[4]),
        amount: Number(row[5]),
        description: String(row[6]),
        observations: String(row[7]),
        status: String(row[8]),
        user: String(row[9])
      };
    }).reverse();
  }

  return ContentService.createTextOutput(JSON.stringify({
    establishments, authorizedUsers, transactions
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'ADD_TRANSACTION') {
      const sheet = ss.getSheetByName("Transacoes") || ss.insertSheet("Transacoes");
      sheet.appendRow([payload.id, payload.date, payload.timestamp, payload.establishmentId, payload.type, payload.amount, payload.description, payload.observations || "", payload.status, payload.user]);
    } 
    else if (action === 'EDIT_TRANSACTION') {
      const sheet = ss.getSheetByName("Transacoes");
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === payload.id) {
          sheet.getRange(i + 1, 6).setValue(payload.amount); // Atualiza Valor
          sheet.getRange(i + 1, 7).setValue(payload.description); // Atualiza Descrição
          sheet.getRange(i + 1, 8).setValue(payload.observations || "");
          break;
        }
      }
    }
    else if (action === 'UPDATE_NOTE') {
      const sheet = ss.getSheetByName("Notas") || ss.insertSheet("Notas");
      sheet.getRange("A1").setValue("Última Anotação Geral");
      sheet.getRange("A2").setValue(payload.note);
      sheet.getRange("B2").setValue(new Date());
      sheet.getRange("C2").setValue(payload.user);
    }

    return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
