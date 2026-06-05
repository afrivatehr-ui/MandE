import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import logoPurple from '../../assets/logo/logo-purple.png'

const PURPLE = '#8D4087'
const LAVENDER = '#F0E7F6'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#000', fontFamily: 'Helvetica' },
  cover: { padding: 48, height: '100%', justifyContent: 'center' },
  logo: { width: 200, marginBottom: 30 },
  coverTitle: { fontSize: 26, color: PURPLE, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  coverSub: { fontSize: 12, color: '#444', marginBottom: 4 },
  h2: { fontSize: 16, color: PURPLE, fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  para: { fontSize: 10, lineHeight: 1.6, marginBottom: 8, color: '#222' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  kpi: { width: '33%', padding: 8 },
  kpiBox: { backgroundColor: LAVENDER, borderRadius: 6, padding: 12 },
  kpiLabel: { fontSize: 8, color: '#555', marginBottom: 4, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, color: PURPLE, fontFamily: 'Helvetica-Bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: PURPLE, color: '#fff', paddingVertical: 6, paddingHorizontal: 4 },
  th: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#fff' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LAVENDER, paddingVertical: 5, paddingHorizontal: 4 },
  td: { fontSize: 9 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
  section: { marginBottom: 18 },
  bullet: { fontSize: 10, marginBottom: 4, color: '#222' },
})

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtVpi = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`)

function Footer() {
  return <Text style={s.footer} fixed>AfriVate Technologies Ltd. — Volunteer M&E Report</Text>
}

export default function ReportDocument({ periodLabel, summary, distribution, orgs, generatedAt }) {
  const aPlayers = distribution.filter((d) => d.category === 'A')
  const cPlayers = distribution.filter((d) => d.category === 'C')

  const narrative = `During ${periodLabel}, Afrivate tracked ${summary.totalVolunteers} volunteer${
    summary.totalVolunteers === 1 ? '' : 's'
  } across ${summary.activeOrgs} partner organisation${summary.activeOrgs === 1 ? '' : 's'}. ` +
    `The average Volunteer Performance Index was ${fmtVpi(summary.avgVpi)}, with ${summary.a} high performer${
      summary.a === 1 ? '' : 's'
    } (Category A), ${summary.b} developing performer${summary.b === 1 ? '' : 's'} (Category B), and ${summary.c} requiring intervention (Category C).`

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <Image src={logoPurple} style={s.logo} />
          <Text style={s.coverTitle}>Volunteer Performance Report</Text>
          <Text style={s.coverSub}>{periodLabel}</Text>
          <Text style={s.coverSub}>Generated {fmtDate(generatedAt)}</Text>
          <Text style={s.coverSub}>Prepared by: Afrivate M&E Team</Text>
        </View>
      </Page>

      {/* Executive summary */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Executive Summary</Text>
        <View style={s.kpiRow}>
          {[
            ['Total Volunteers', summary.totalVolunteers],
            ['Average VPI', fmtVpi(summary.avgVpi)],
            ['Partner Orgs', summary.activeOrgs],
            ['A-Players', summary.a],
            ['B-Players', summary.b],
            ['C-Players', summary.c],
          ].map(([label, value]) => (
            <View key={label} style={s.kpi}>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>{label}</Text>
                <Text style={s.kpiValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={s.para}>{narrative}</Text>
        <Footer />
      </Page>

      {/* VPI distribution */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>VPI Distribution</Text>
        <View style={s.tableHeader}>
          <Text style={[s.th, { width: '32%' }]}>Volunteer</Text>
          <Text style={[s.th, { width: '30%' }]}>Organisation</Text>
          <Text style={[s.th, { width: '12%' }]}>VPI</Text>
          <Text style={[s.th, { width: '10%' }]}>Cat.</Text>
          <Text style={[s.th, { width: '16%' }]}>Action</Text>
        </View>
        {distribution.map((d, i) => (
          <View key={i} style={s.row}>
            <Text style={[s.td, { width: '32%' }]}>{d.name}</Text>
            <Text style={[s.td, { width: '30%' }]}>{d.org}</Text>
            <Text style={[s.td, { width: '12%' }]}>{d.vpi}%</Text>
            <Text style={[s.td, { width: '10%' }]}>{d.category}</Text>
            <Text style={[s.td, { width: '16%' }]}>{flag(d.category)}</Text>
          </View>
        ))}
        {!distribution.length && <Text style={s.para}>No scored deployments in this period.</Text>}
        <Footer />
      </Page>

      {/* Org scorecards */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Organisation Scorecards</Text>
        <View style={s.tableHeader}>
          <Text style={[s.th, { width: '34%' }]}>Organisation</Text>
          <Text style={[s.th, { width: '16%' }]}>Volunteers</Text>
          <Text style={[s.th, { width: '18%' }]}>Avg VPI</Text>
          <Text style={[s.th, { width: '12%' }]}>Tier</Text>
          <Text style={[s.th, { width: '20%' }]}>Repeat Req.</Text>
        </View>
        {orgs.map((o) => (
          <View key={o.id} style={s.row}>
            <Text style={[s.td, { width: '34%' }]}>{o.name}</Text>
            <Text style={[s.td, { width: '16%' }]}>{o.volunteersDeployed}</Text>
            <Text style={[s.td, { width: '18%' }]}>{fmtVpi(o.avgVpi)}</Text>
            <Text style={[s.td, { width: '12%' }]}>{o.tier ?? '—'}</Text>
            <Text style={[s.td, { width: '20%' }]}>{o.repeatRate == null ? '—' : `${o.repeatRate}%`}</Text>
          </View>
        ))}
        <Footer />
      </Page>

      {/* Action items */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Action Items</Text>
        <View style={s.section}>
          <Text style={[s.para, { fontFamily: 'Helvetica-Bold', color: PURPLE }]}>Urgent review (Category C)</Text>
          {cPlayers.length ? cPlayers.map((d, i) => (
            <Text key={i} style={s.bullet}>• {d.name} — {d.org} ({d.vpi}%)</Text>
          )) : <Text style={s.para}>None.</Text>}
        </View>
        <View style={s.section}>
          <Text style={[s.para, { fontFamily: 'Helvetica-Bold', color: PURPLE }]}>Recognise (Category A)</Text>
          {aPlayers.length ? aPlayers.map((d, i) => (
            <Text key={i} style={s.bullet}>• {d.name} — {d.org} ({d.vpi}%)</Text>
          )) : <Text style={s.para}>None.</Text>}
        </View>
        <Footer />
      </Page>

      {/* Scoring reference */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Appendix: Scoring Reference</Text>
        <Text style={s.para}>VPI% = ((Task + Professionalism + Impact + (Overall / 2)) / 4) × 20</Text>
        <Text style={s.bullet}>• Category A (≥ 80%): High Performer — Retain & Recognise</Text>
        <Text style={s.bullet}>• Category B (60–79%): Developing Performer — Develop & Monitor</Text>
        <Text style={s.bullet}>• Category C (&lt; 60%): Needs Intervention — Urgent Review</Text>
        <Text style={[s.para, { marginTop: 12, fontFamily: 'Helvetica-Bold', color: PURPLE }]}>Review cadence</Text>
        <Text style={s.bullet}>• Weekly: check responses</Text>
        <Text style={s.bullet}>• Monthly: compile org averages, share with Programme team</Text>
        <Text style={s.bullet}>• Quarterly: Executive review</Text>
        <Text style={s.bullet}>• Annually: framework audit</Text>
        <Footer />
      </Page>
    </Document>
  )
}

function flag(category) {
  return { A: 'Retain', B: 'Develop', C: 'Urgent Review' }[category] ?? ''
}
