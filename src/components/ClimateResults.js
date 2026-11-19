import Icon from "./Icon";
import { RISKS, RISK_LEVELS, dateLabel, numberLabel, riskLevel } from "@/lib/weather.mjs";

export default function ClimateResults({ data, controls }) {
  const thresholds = data.referencia_umbral_adversa_local_c;
  const highest = [...RISKS].sort((a, b) => data[b.key] - data[a.key])[0];
  return <section className="result-section" aria-labelledby="result-heading">
    <div className="section-header">
      <div>
        <p className="eyebrow"><Icon name="chart" size={17} /> Evaluación climatológica</p>
        <h2 id="result-heading">Riesgos para tu evento</h2>
        <p className="subtle">{dateLabel(data.fecha_objetivo)} <span aria-hidden="true">·</span> {numberLabel(data.latitud, 5)}°, {numberLabel(data.longitud, 5)}°</p>
      </div>
      {controls}
    </div>
    <div className="risk-grid">
      {RISKS.map(({ key, name, icon, definition }) => {
        const value = data[key], level = riskLevel(value);
        return <article className={`card risk-card risk-${level.id}`} key={key}>
          <div className="risk-head">
            <span className="tile-icon"><Icon name={icon} /></span>
            <span className="risk-tag"><span className="risk-dot" aria-hidden="true" /> Riesgo {level.label.toLowerCase()}</span>
          </div>
          <h3>{name}</h3>
          <div className="risk-number">{numberLabel(value)}<span>%</span></div>
          <div className="risk-track" aria-hidden="true"><span style={{ width: `${value}%` }} /></div>
          <p>{definition}</p>
          {icon === "temperature" && <p className="thresholds">
            Calor ≥ {numberLabel(thresholds.calor_extremo_desde, 1)} °C · Frío ≤ {numberLabel(thresholds.frio_extremo_hasta, 1)} °C
          </p>}
        </article>;
      })}
    </div>
    <ul className="risk-legend" aria-label="Semáforo de riesgo">
      {RISK_LEVELS.map(({ id, label, range }) => <li key={id} className={`risk-${id}`}>
        <span className="risk-dot" aria-hidden="true" />
        <strong>{label}</strong>{" "}<span>{range}</span>
      </li>)}
    </ul>
    <div className="notice">
      <Icon name="info" />
      <div><strong>Cómo interpretar estos resultados</strong>
        <p>La mayor probabilidad es <strong>{highest.name.toLowerCase()} ({numberLabel(data[highest.key])} %)</strong>. Los niveles del semáforo son orientativos. Las probabilidades no se suman ni indican la intensidad del fenómeno.</p>
        <p>Usa estas estimaciones históricas para planificar contingencias y consulta el pronóstico oficial cuando se acerque la fecha.</p>
      </div>
    </div>
  </section>;
}
