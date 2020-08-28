import { text } from '../../../fields/Text'
import { textarea } from '../../../fields/Textarea'
import { belongsTo } from '../../../fields/BelongsTo'
import { resource } from '../../../resources/Resource'

export default resource('Comment').fields([
    text('Title').rules('required').searchable(),
    textarea('Body').rules('required'),
    belongsTo('Post'),
])