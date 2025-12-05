import PDFDocument from "pdfkit";
import type { TaxReportEntry, CapitalGainsEntry } from "@shared/schema";

interface IN2991ReportData {
  username: string;
  year: number;
  taxEntries: TaxReportEntry[];
  capitalGains: CapitalGainsEntry[];
  ptaxRate: number;
  generatedAt: Date;
}

export function generateIN2991Report(data: IN2991ReportData): PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `IN 2991 - Extrato Fiscal ${data.year}`,
      Author: "ERPCrypto",
      Subject: "Relatório Fiscal de Criptoativos",
    },
  });

  const primaryColor = "#6366f1";
  const textColor = "#1f2937";
  const mutedColor = "#6b7280";

  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor(primaryColor)
    .text("ERPCrypto", 50, 50);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(mutedColor)
    .text("Plataforma de Gestão de Criptoativos", 50, 78);

  doc.moveTo(50, 100).lineTo(545, 100).strokeColor("#e5e7eb").stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(textColor)
    .text("Extrato Fiscal IN 2991", 50, 120);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(textColor)
    .text(`Ano-Calendário: ${data.year}`, 50, 150)
    .text(`Usuário: ${data.username}`, 50, 168)
    .text(`Gerado em: ${formatDate(data.generatedAt)}`, 50, 186)
    .text(`Taxa PTAX: R$ ${data.ptaxRate.toFixed(4)}`, 50, 204);

  let yPosition = 240;

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(primaryColor)
    .text("1. Resumo de Ganhos de Capital", 50, yPosition);

  yPosition += 25;

  if (data.capitalGains.length > 0) {
    const tableHeaders = ["Mês", "Volume Vendas (BRL)", "Tributável", "Imposto Devido"];
    const columnWidths = [100, 150, 80, 150];

    doc.font("Helvetica-Bold").fontSize(9).fillColor(textColor);
    let xPos = 50;
    tableHeaders.forEach((header, i) => {
      doc.text(header, xPos, yPosition, { width: columnWidths[i] });
      xPos += columnWidths[i];
    });

    yPosition += 18;
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor("#e5e7eb").stroke();
    yPosition += 8;

    doc.font("Helvetica").fontSize(9);

    let totalSellVolume = 0;
    let totalTaxDue = 0;

    data.capitalGains.forEach((entry) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }

      totalSellVolume += entry.sellVolumeBrl;
      totalTaxDue += entry.taxDueBrl;

      xPos = 50;
      doc.fillColor(textColor);
      doc.text(formatMonth(entry.month), xPos, yPosition, { width: columnWidths[0] });
      xPos += columnWidths[0];
      doc.text(formatCurrency(entry.sellVolumeBrl), xPos, yPosition, { width: columnWidths[1] });
      xPos += columnWidths[1];
      doc.fillColor(entry.taxable ? "#ef4444" : "#22c55e");
      doc.text(entry.taxable ? "Sim" : "Não", xPos, yPosition, { width: columnWidths[2] });
      xPos += columnWidths[2];
      doc.fillColor(textColor);
      doc.text(formatCurrency(entry.taxDueBrl), xPos, yPosition, { width: columnWidths[3] });

      yPosition += 16;
    });

    yPosition += 5;
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor("#e5e7eb").stroke();
    yPosition += 10;

    doc.font("Helvetica-Bold").fillColor(textColor);
    doc.text("TOTAL:", 50, yPosition, { width: 100 });
    doc.text(formatCurrency(totalSellVolume), 150, yPosition, { width: 150 });
    doc.text("", 300, yPosition, { width: 80 });
    doc.text(formatCurrency(totalTaxDue), 380, yPosition, { width: 150 });

    yPosition += 30;
  } else {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(mutedColor)
      .text("Nenhum ganho de capital registrado para este período.", 50, yPosition);
    yPosition += 30;
  }

  if (yPosition > 600) {
    doc.addPage();
    yPosition = 50;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(primaryColor)
    .text("2. Detalhamento de Operações", 50, yPosition);

  yPosition += 25;

  if (data.taxEntries.length > 0) {
    const opHeaders = ["Data", "Tipo", "Descrição", "USD", "BRL"];
    const opWidths = [70, 70, 180, 90, 90];

    doc.font("Helvetica-Bold").fontSize(9).fillColor(textColor);
    let xPos = 50;
    opHeaders.forEach((header, i) => {
      doc.text(header, xPos, yPosition, { width: opWidths[i] });
      xPos += opWidths[i];
    });

    yPosition += 18;
    doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor("#e5e7eb").stroke();
    yPosition += 8;

    doc.font("Helvetica").fontSize(8);

    data.taxEntries.slice(0, 30).forEach((entry) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }

      xPos = 50;
      doc.fillColor(textColor);
      doc.text(formatDateShort(entry.date), xPos, yPosition, { width: opWidths[0] });
      xPos += opWidths[0];
      doc.text(translateOperationType(entry.operationType), xPos, yPosition, { width: opWidths[1] });
      xPos += opWidths[1];
      doc.text(truncateText(entry.description, 35), xPos, yPosition, { width: opWidths[2] });
      xPos += opWidths[2];
      doc.text(`$${entry.valueUsd.toFixed(2)}`, xPos, yPosition, { width: opWidths[3] });
      xPos += opWidths[3];
      doc.text(formatCurrency(entry.valueBrl), xPos, yPosition, { width: opWidths[4] });

      yPosition += 14;
    });

    if (data.taxEntries.length > 30) {
      yPosition += 10;
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(mutedColor)
        .text(`... e mais ${data.taxEntries.length - 30} operações`, 50, yPosition);
    }
  } else {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(mutedColor)
      .text("Nenhuma operação registrada para este período.", 50, yPosition);
  }

  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(mutedColor)
      .text(`Página ${i + 1} de ${pageCount}`, 50, 800, { align: "center", width: 495 });
    doc.text("Este documento foi gerado automaticamente pelo ERPCrypto", 50, 815, {
      align: "center",
      width: 495,
    });
  }

  return doc;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function translateOperationType(type: string): string {
  const translations: Record<string, string> = {
    buy: "Compra",
    sell: "Venda",
    swap: "Swap",
    transfer_in: "Entrada",
    transfer_out: "Saída",
    lost_funds: "Perda",
    pool_fees: "Taxas Pool",
  };
  return translations[type] || type;
}
