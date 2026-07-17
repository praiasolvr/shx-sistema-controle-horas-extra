import React, { useState } from "react";
import { db } from "../firebase";
import {
  collectionGroup,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  limit,
} from "firebase/firestore";
import * as XLSX from "xlsx";

export default function Reports() {

  return (
    <div className="min-h-screen bg-cloud p-8 font-body text-ink">
      {/* Cabeçalho principal com Barlow Condensed */}
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold tracking-wide uppercase text-ink">
          Painel de Relatórios - Em Desenvolvimento
        </h1>
        <p className="text-sm font-medium text-slate">
          Consultas e gerenciamentos de lançamentos de meses anteriores.
        </p>
      </header>
    </div>
  );
}
