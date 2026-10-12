import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Bestätige deine E-Mail-Änderung für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>E-Mail-Änderung bestätigen</Heading>
        <Text style={text}>
          Du hast angefragt, deine E-Mail-Adresse für {siteName} von{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          zu{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Klicke auf die Schaltfläche unten, um diese Änderung zu bestätigen:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Änderung bestätigen
        </Button>
        <Text style={footer}>
          Falls du diese Änderung nicht angefordert hast, sichere bitte umgehend
          dein Konto.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: 'inherit', textDecoration: 'underline' }
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
