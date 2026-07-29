import ImmersiveGlobe from './ImmersiveGlobe'

type ImmersivePlaceholderProps = {
  className?: string
}

export default function ImmersivePlaceholder({
  className
}: ImmersivePlaceholderProps) {
  return <ImmersiveGlobe className={className} />
}
