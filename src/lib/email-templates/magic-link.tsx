import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Dein Login-Link für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Dein Login-Link</Heading>
        <Text style={text}>
          Klicke auf die Schaltfläche unten, um dich bei {siteName} anzumelden.
          Dieser Link läuft in Kürze ab.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Anmelden
        </Button>
        {token ? (
          <Text style={text}>
            Oder gib diesen Code in der App ein: <b style={{ fontSize: '22px', letterSpacing: '4px', color: '#000000' }}>{token}</b>
          </Text>
        ) : null}
        <Text style={footer}>
          Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#7AC943',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #7AC943',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
`
