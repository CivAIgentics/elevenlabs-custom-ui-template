import Link from 'next/link'
import styles from '../styles/home.module.css'

function Custom404() {
  return (
    <main className={styles.main}>
      <h1>404 - Page Not Found</h1>
      <p>Sorry, the page you are looking for does not exist.</p>
      <Link href="/">
        <a>Go back to Home</a>
      </Link>
    </main>
  )
}

export default Custom404