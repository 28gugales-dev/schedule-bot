// Single place to register the GSAP React plugin so useGSAP cleanup works
// everywhere. Import { gsap, useGSAP } from here, not from the packages directly.
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export { gsap, useGSAP }
