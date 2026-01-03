
  /**
  * GSC FLUXO DE CAIXA - BACKEND BRIDGE v2.1
  * Otimizado para persistência multi-entidade, edições e anotações
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
    let userSheet = ss.getSheetByName("Usuarios") || ss.getSheetByName("Usuários") || ss.insertSheet("Usuarios");
    const userValues = userSheet.getDataRange().getValues();
    const authorizedUsers = userValues.length > 1 ? userValues.slice(1)
        .filter(row => row[1] && String(row[1]).includes("@"))
        .map(row => ({
          email: String(row[1]).toLowerCase().trim(),
          role: String(row[2]) || 'Operador'
        })) : [];

    // 3. Get Transactions
    const transSheet = ss.getSheetByName("Transacoes") || ss.insertSheet("Transacoes");
    const transValues = transSheet.getDataRange().getValues();
    let transactions = [];
    if (transValues.length > 1) {
      transactions = transValues.slice(1).map(row => {
        let dateStr = row[1];
        if (row[1] instanceof Date) dateStr = row[1].toISOString().split('T')[0];
        
        return {
          id: String(row[0]),
          date: String(dateStr),
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

    // 4. Get Notes
    const notesSheet = ss.getSheetByName("Configuracoes") || ss.insertSheet("Configuracoes");
    const notes = notesSheet.getRange("A2").getValue() || "";

    const output = {
      establishments: establishments,
      authorizedUsers: authorizedUsers,
      transactions: transactions,
      notes: notes
    };

    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function doPost(e) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const payload = JSON.parse(e.postData.contents);
      const action = payload.action;

      if (action === 'ADD_TRANSACTION') {
        const sheet = ss.getSheetByName("Transacoes") || ss.insertSheet("Transacoes");
        sheet.appendRow([
          payload.id,
          payload.date,
          payload.timestamp,
          payload.establishmentId,
          payload.type,
          payload.amount,
          payload.description,
          payload.observations || "",
          payload.status,
          payload.user
        ]);
      } 
      else if (action === 'EDIT_TRANSACTION') {
        const sheet = ss.getSheetByName("Transacoes");
        const data = sheet.getDataRange().getValues();
        const idToFind = payload.id;
        
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]) === idToFind) {
            // Update the specific row
            // Columns: A=0(ID), B=1(Date), C=2(TS), D=3(EstID), E=4(Type), F=5(Amount), G=6(Desc), H=7(Obs), I=8(Status), J=9(User)
            const range = sheet.getRange(i + 1, 1, 1, 10);
            range.setValues([[
              payload.id,
              payload.date,
              payload.timestamp,
              payload.establishmentId,
              payload.type,
              payload.amount,
              payload.description,
              payload.observations || "",
              payload.status,
              payload.user
            ]]);
            break;
          }
        }
      }
      else if (action === 'UPDATE_NOTE') {
        const sheet = ss.getSheetByName("Configuracoes") || ss.insertSheet("Configuracoes");
        sheet.getRange("A1").setValue("Anotacoes");
        sheet.getRange("A2").setValue(payload.notes);
      }
      else if (action === 'ADD_ESTABLISHMENT') {
        const sheet = ss.getSheetByName("Estabelecimentos") || ss.insertSheet("Estabelecimentos");
        sheet.appendRow([
          payload.id,
          payload.name,
          payload.responsibleEmail
        ]);
      }
      else if (action === 'ADD_USER') {
        const sheet = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");
        sheet.appendRow([
          payload.id || Utilities.getUuid(),
          payload.email.toLowerCase().trim(),
          payload.role || 'Operador'
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
