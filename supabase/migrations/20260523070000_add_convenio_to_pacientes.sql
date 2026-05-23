-- Adiciona campo convenio à tabela pacientes
-- Registra de onde o paciente veio (ex: Unimed, Bradesco, Indicação, Particular)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS convenio text;
