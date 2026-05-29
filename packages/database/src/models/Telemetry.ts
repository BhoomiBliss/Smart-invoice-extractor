import mongoose, { Schema, Document } from 'mongoose';

export interface ITelemetryDocument extends Document {
  metricName: string;
  metricValue: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

const TelemetrySchema = new Schema<ITelemetryDocument>({
  metricName: { type: String, required: true, index: true },
  metricValue: { type: Number, required: true },
  tags: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const TelemetryModel = mongoose.models.Telemetry || mongoose.model<ITelemetryDocument>('Telemetry', TelemetrySchema);
export default TelemetryModel;
