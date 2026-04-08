import DOMPurify from 'dompurify';

/**
 * Sanitiza uma string HTML usando DOMPurify, impedindo injeções de script.
 * @param input A string (potencialmente maliciosa)
 * @returns A string sanitizada, livre de tags nocivas e JS inline
 */
export const sanitizeString = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // Limpa o input, transformando possíveis vetores XSS em caracteres seguros ou removendo-os
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol'],
    ALLOWED_ATTR: ['href', 'target'],
  });
};

/**
 * Utilitário para limpar qualquer objeto genérico antes de enviá-lo ao Supabase.
 * Itera sob as propriedades; se achar uma string, sanitiza. Retorna o próprio objeto corrigido.
 * Importante para chamadas como `supabase.from('tableName').insert(sanitizeObject(data))`
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const newObj = { ...obj };

  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      const val = newObj[key];
      if (typeof val === 'string') {
        // @ts-ignore
        newObj[key] = sanitizeString(val);
      } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && !((val as any) instanceof Date)) {
        // Objeto aninhado simples, faz recursão (opcional, mas bom ter)
        newObj[key] = sanitizeObject(val);
      }
    }
  }

  return newObj;
};

/**
 * Sanitiza strings para o Export (Excel, PDF e CSV).
 * Evita o 'CSV Formula Injection' (caracteres maliciosos = + - @ que rodam macros).
 * Remove também quebras de linha invisíveis em excesso que explodem o autoTable do jsPDF.
 */
export const sanitizeExportCell = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) return '';
  let str = String(input);
  
  // 1. Remove quebras de linha sucessivas invisíveis que explodem bibliotecas PDF
  str = str.replace(/\n{2,}/g, ' ');

  // 2. Trava contra CSV / Excel Injection de Macros/Fórmulas
  const maliciousStartChars = ['=', '+', '-', '@', '\t', '\r'];
  if (maliciousStartChars.some(char => str.startsWith(char))) {
    // Insere uma aspa simples na frente para forçar o Excel a ler como texto puro.
    str = "'" + str; 
  }

  return str;
};
