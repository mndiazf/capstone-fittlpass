package com.capstone_fitps.capstorne_fitpass.db;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.postgresql.util.PGobject;

@Converter(autoApply = false)
public class VectorFloatToPgObjectConverter implements AttributeConverter<float[], PGobject> {

    @Override
    public PGobject convertToDatabaseColumn(float[] attribute) {
        if (attribute == null) return null;
        try {
            StringBuilder sb = new StringBuilder("(");
            for (int i = 0; i < attribute.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(attribute[i]);
            }
            sb.append(')');

            PGobject obj = new PGobject();
            obj.setType("vector");
            obj.setValue(sb.toString());
            return obj;
        } catch (Exception e) {
            throw new IllegalArgumentException("Error al convertir embedding a pgvector", e);
        }
    }

    @Override
    public float[] convertToEntityAttribute(PGobject dbData) {
        if (dbData == null || dbData.getValue() == null) return null;
        String v = dbData.getValue().trim();
        if (v.startsWith("(") && v.endsWith(")")) v = v.substring(1, v.length() - 1);
        if (v.isEmpty()) return new float[0];
        String[] parts = v.split(",");
        float[] out = new float[parts.length];
        for (int i = 0; i < parts.length; i++) out[i] = Float.parseFloat(parts[i]);
        return out;
    }
}
