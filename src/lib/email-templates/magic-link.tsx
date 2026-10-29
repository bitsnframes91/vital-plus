import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl?: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Dein Login-Code für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Dein Login-Code</Heading>
        <Text style={text}>
          Gib diesen Code in der {siteName} App ein, um dich anzumelden. Der Code läuft in Kürze ab.
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Falls du diesen Code nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.
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
const codeStyle = { fontSize: '32px', fontWeight: 'bold' as const, letterSpacing: '8px', color: '#000000', margin: '0 0 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #7AC943 !important; color: #ffffff !important; }
`
