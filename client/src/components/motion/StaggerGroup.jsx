import { motion } from 'framer-motion'
import { staggerContainer } from './motion.constants.js'

// Orchestration container — pairs with plain motion.div children that use
// variants={itemVariant(...)} (see motion.constants.js) so a group of cards
// reveals as one cascade instead of N independent whileInView triggers
// firing at slightly different scroll offsets.
export default function StaggerGroup({
  as: Component = motion.div,
  staggerChildren = 0.12,
  delayChildren = 0,
  once = true,
  viewportMargin = '-80px',
  className,
  style,
  children,
}) {
  return (
    <Component
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: viewportMargin }}
      variants={staggerContainer(staggerChildren, delayChildren)}
    >
      {children}
    </Component>
  )
}
