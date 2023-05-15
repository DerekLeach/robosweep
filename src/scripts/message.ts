export default function sendMessage(message: string, delay?: number): void {
  const div = document.createElement('div');
  const messageClassName = "alert";
  div.className = messageClassName;
  div.innerHTML = message;


  const closeButton = document.createElement('span');
  closeButton.className = "close-button";
  closeButton.innerHTML = "&times";
  div.prepend(closeButton);

  closeButton.addEventListener('click', function() {
    const div = this.parentElement;
    if (div instanceof HTMLDivElement && div.classList.contains(messageClassName)) {
      div.style.opacity = "0";
      setTimeout(() => div.remove(), 600)
    }
  });

  document.getElementsByTagName('aside')[0].append(div);
  
  if (typeof delay !== 'undefined') {
    setTimeout(() => div.remove(), delay);
  }
}
